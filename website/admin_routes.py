# Fix the import statements
from flask import Blueprint, jsonify, request, session, make_response
from werkzeug.security import generate_password_hash
from models import User, Form, Activity, Process, Hazard, Risk, HazardType, Division, RA_team, Audit
from models import db
import random
import string
from flask_cors import CORS, cross_origin
from math import ceil
from datetime import datetime, timezone, timedelta
from .rag import *

# Define Singapore timezone (GMT+8)
SINGAPORE_TZ = timezone(timedelta(hours=8))


# Create a new blueprint for admin routes
admin = Blueprint('admin', __name__)
CORS(admin, supports_credentials=True)  # Enable credentials support for cookies

def create_audit_log(audit_user_id, action, target_user_id):
    """
    Create an audit log entry
    
    Args:
        audit_user_id: ID of the user performing the action
        action: Description of the action (e.g., 'POST - login', 'UPDATE - edit user details')
        target_user_id: ID of the user being affected by the action
    
    Returns:
        bool: True if successful, False otherwise
    """
    print(f"\n=== CREATE AUDIT LOG CALLED ===")
    print(f"Input - User ID: {audit_user_id}, Action: '{action}', Target: {target_user_id}")
    
    try:
        # Extract action type from action string (e.g., "POST" from "POST - login")
        action_type = action.split(" - ")[0] if " - " in action else ""
        action = action.split(" - ")[1] if " - " in action else action
        
        # Get target user's name
        target_user = User.query.get(target_user_id)
        target_user_name = target_user.user_name if target_user else f"User ID: {target_user_id}"
        
        # Get current Singapore time (GMT+8)
        singapore_time = datetime.now(SINGAPORE_TZ)
        
        print(f"Creating audit log with:")
        print(f"  - audit_user: {audit_user_id}")
        print(f"  - audit_action: {action}")
        print(f"  - audit_actiontype: {action_type}")
        print(f"  - audit_targetuser: {target_user_name}")
        print(f"  - audit_time: {singapore_time}")
        
        audit_log = Audit(
            audit_user=audit_user_id,
            audit_action=action,
            audit_actiontype=action_type,
            audit_targetuser=target_user_name,
            audit_time=singapore_time
        )
        
        print(f"Audit object created: {audit_log}")
        print(f"Audit object attributes: audit_id={audit_log.audit_id}, audit_user={audit_log.audit_user}")
        
        db.session.add(audit_log)
        print("Audit log added to session")
        
        db.session.flush()
        print(f"Session flushed, audit_id should be: {audit_log.audit_id}")
        
        db.session.commit()
        print(f"Audit log committed successfully with ID: {audit_log.audit_id}")
        print(f"Audit log created: User {audit_user_id} - Action: '{action}' - Type: '{action_type}' - Target: {target_user_name}")
        return True
    except Exception as e:
        print(f"Error creating audit log: {str(e)}")
        print(f"Error type: {type(e).__name__}")
        import traceback
        traceback.print_exc()
        db.session.rollback()
        print("Database session rolled back")
        return False

@admin.route('/notification', methods=['GET'])
def notification():
    try:
        knowledge_base, kb_embeddings = load_hazard_kb_and_embeddings()
        hazards = Hazard.query.filter(Hazard.approval == None).all()
        for hazard in hazards:
            if not hazard.hazard or not hazard.hazard.strip():
                continue
            if get_hazard_match(hazard.hazard, knowledge_base, kb_embeddings):
                return jsonify(True)
        return jsonify(False)
    except Exception as e:
        print("Error in /notification:", str(e))
        return jsonify({"success": False, "error": str(e)}), 500


@admin.route('/reject_hazard', methods=['POST'])
def reject_hazard():
    print("=== Reject Hazard Called ===")
    # Get JSON payload
    data = request.get_json()
    
    if not data:
        print("Error: No data provided in request")
        return jsonify({"success": False, "message": "No data provided"}), 400
    
    print("Received data:", data)
    # set hazard approval to 0
    hazard = Hazard.query.filter_by(hazard_id=int(data.get("hazard_id"))).first()
    if hazard:
        hazard.approval = 0
        db.session.commit()
        print(f"Success: Hazard {data.get('hazard_id')} marked as rejected")
    else:
        print(f"Error: Hazard {data.get('hazard_id')} not found")
        return jsonify({"success": False, "message": "Hazard not found"}), 404
    return jsonify({"success": True, "message": "Hazard rejected", "hazard_id": data.get("hazard_id")})
    

@admin.route('/approve_hazard', methods=['POST'])
def approve_hazard():
    print("=== Approve Hazard Called ===")
    # Get JSON payload
    data = request.get_json()
    
    if not data:
        print("Error: No data provided in request")
        return jsonify({"success": False, "message": "No data provided"}), 400
    
    print("Received data:", data)
    # set hazard approval to 1
    hazard = Hazard.query.filter_by(hazard_id=int(data.get("hazard_id"))).first()
    if hazard:
        hazard.approval = 1  # mark as approved
        db.session.commit()
        print(f"Success: Hazard {data.get('hazard_id')} marked as approved")
    else:
        print(f"Error: Hazard {data.get('hazard_id')} not found")
        return jsonify({"success": False, "message": "Hazard not found"}), 404
    
    # need to use data.get('hazard_id') to retrieve other info from hazard table
    # Get the related activity and hazard type using relationships
    hazard_type_lookup = {ht.hazard_type_id: getattr(ht, 'hazard_type', None) or "Unknown type" for ht in HazardType.query.all()}
    activity = Activity.query.get(hazard.hazard_activity_id) if hazard.hazard_activity_id else None
    hazard_type = HazardType.query.get(hazard.hazard_type_id) if hazard.hazard_type_id else None
    
    # More robust form lookup
    form = None
    process = None
    if activity and activity.activity_process_id:
        process = Process.query.get(activity.activity_process_id)
        if process and process.process_form_id:
            form = Form.query.get(process.process_form_id)
    
    # user = User.query.get(form.form_user_id) if form and form.form_user_id else None
    risk = Risk.query.filter_by(risk_hazard_id=hazard.hazard_id).first() if hazard.hazard_id else None
    # process = Process.query.get(activity.activity_process_id)

    # add the data into the known data table
    try:
        # new_known_data = KnownData(
        #     title = data.get("form_title"),
        #     process = data.get("process"),
        #     activity_name=data.get("work_activity"),
        #     hazard_type=data.get("hazard_type"),
        #     hazard_des=data.get("hazard"),
        #     injury=data.get("injury"),
        #     control=data.get("existing_risk_control"),
        #     severity=int(data.get("severity")),
        #     likelihood=int(data.get("likelihood")),
        #     rpn=int(data.get("RPN"))
        # )
        new_known_data = KnownData(
            title = form.title if form else "Unknown form",
            process = process.process_title if process else "Unknown Process",
            activity_name=activity.work_activity if activity else "Unknown activity",
            hazard_type=hazard_type_lookup.get(hazard.hazard_type_id, "Unknown type"),
            hazard_des=hazard.hazard or "No hazard description",
            injury=hazard.injury or "No injury description",
            control=risk.existing_risk_control if risk else "None specified",
            severity=risk.severity if risk else 0,
            likelihood=risk.likelihood if risk else 0,
            rpn=risk.RPN if risk else 0
        )
        db.session.add(new_known_data)
        db.session.commit()
        print("Success: New known data added to KnownData table")
    except Exception as e:
        db.session.rollback()
        print(f"Error adding known data: {e}")
        return jsonify({"success": False, "message": "Failed to add known data"}), 500

    # add activity name into kb.txt and reembed it
    try:
        with open(os.path.join(os.path.dirname(__file__), 'kb.txt'), 'a') as f:
            # f.write(f"&&{data.get('work_activity')}")
            f.write(f"&&{activity.work_activity if activity else 'Unknown activity'}")
        reembed_kb()
        print("Success: reembed_kb() called")
    except Exception as e:
        print(f"Error updating kb.txt or reembedding: {e}")
        return jsonify({"success": False, "message": "Failed to update kb.txt"}), 500

    # add hazard des into kbhazard.txt and reembed it
    try:
        with open(os.path.join(os.path.dirname(__file__), 'kbhazard.txt'), 'a') as f:
            # f.write(f"&&{data.get('hazard')}")
            f.write(f"&&{hazard.hazard or 'No hazard description'}")
        print("Success: Hazard description appended to kbhazard.txt")
        reembed_kbhazard()
        print("Success: reembed_kbhazard() called")
    except Exception as e:
        print(f"Error updating kbhazard.txt or reembedding: {e}")
        return jsonify({"success": False, "message": "Failed to update kbhazard.txt"}), 500
    
    # add form and process into kbtitleprocess.txt and reembed it
    try:
        with open(os.path.join(os.path.dirname(__file__), 'kbtitleprocess.txt'), 'a') as f:
            # f.write(f"&&{data.get('form_title')}%%{data.get('process')}")
            f.write(f"&&{form.title if form else 'Unknown form'}%%{process.process_title if process else 'Unknown Process'}")
        print("Success: appended to kbtitleprocess.txt")
        reembed_kbtitleprocess()
        print("Success: reembed_kbtitleprocess() called")
    except Exception as e:
        print(f"Error updating kbtitleprocess.txt or reembedding: {e}")
        return jsonify({"success": False, "message": "Failed to update kbtitleprocess.txt"}), 500

    print("Hazard approval process completed successfully")
    return jsonify({"success": True, "message": "Hazard approved", "hazard_id": data.get("hazard_id")})

    # add existing controls into kbcontrol.txt and reembed it
    try:
        with open(os.path.join(os.path.dirname(__file__), 'kbcontrol.txt'), 'a') as f:
            f.write(f"&&{data.get('existing_risk_control')}")
        print("Success: Control appended to kbcontrol.txt")
        reembed_kbcontrol() # need to create
        print("Success: reembed_kbcontrol() called")
    except Exception as e:
        print(f"Error updating kbcontrol.txt or reembedding: {e}")
        return jsonify({"success": False, "message": "Failed to update kbcontrol.txt"}), 500

    # add injury into kbinjury.txt and reembed it
    try:
        with open(os.path.join(os.path.dirname(__file__), 'kbinjury.txt'), 'a') as f:
            f.write(f"&&{data.get('injury')}")
        print("Success: Injury appended to kbinjury.txt")
        reembed_kbinjury() # need to create
        print("Success: reembed_kbinjury() called")
    except Exception as e:
        print(f"Error updating kbinjury.txt or reembedding: {e}")
        return jsonify({"success": False, "message": "Failed to update kbinjury.txt"}), 500

#db management gold mine
@admin.route('/get_new_hazard', methods=['GET', 'POST'])
def get_new_hazard():
    # Query all hazards where approval is NULL
    knowledge_base, kb_embeddings = load_hazard_kb_and_embeddings()
    knowledge_base_control, kb_embeddings_control = load_control_kb_and_embeddings()
    knowledge_base_activity, kb_embeddings_activity = load_activity_kb_and_embeddings()
    knowledge_base_injury, kb_embeddings_injury = load_injury_kb_and_embeddings()
    hazards = Hazard.query.filter(Hazard.approval == None).all()
    # hazards = Hazard.query.filter(Hazard.approval.is_(None), Hazard.ai == 'ai').all()
    matched_hazards = []
    for hazard in hazards:
        if not hazard.hazard or not hazard.hazard.strip():
            print(f"Skipping invalid hazard text: {hazard.hazard!r}")
            continue
        else:
            matched_hazards.append(hazard)

        # if get_hazard_match(hazard.hazard, knowledge_base, kb_embeddings):
        #     matched_hazards.append(hazard)
        # else:
        #     hazard.approval = 0
        #     db.session.commit()
    
    results = []
    hazard_type_lookup = {ht.hazard_type_id: getattr(ht, 'hazard_type', None) or "Unknown type" for ht in HazardType.query.all()}
    for hazard in matched_hazards:
        try:
            # Get the related activity and hazard type using relationships
            activity = Activity.query.get(hazard.hazard_activity_id) if hazard.hazard_activity_id else None
            # hazard_type = HazardType.query.get(hazard.hazard_type_id) if hazard.hazard_type_id else None
            
            # More robust form lookup
            form = None
            process = None
            if activity and activity.activity_process_id:
                process = Process.query.get(activity.activity_process_id)
                if process and process.process_form_id:
                    form = Form.query.get(process.process_form_id)
            
            # user = User.query.get(form.form_user_id) if form and form.form_user_id else None
            risk = Risk.query.filter_by(risk_hazard_id=hazard.hazard_id).first() if hazard.hazard_id else None
            # process = Process.query.get(activity.activity_process_id)
            
            def format_date(date_obj):
                return date_obj.isoformat() if date_obj else None
            
            # form.last_access_date = format_date(form.last_access_date)
            # FIX THIS LATER !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

            #THIS PART HERE
            # for each hazard from ai, check if it exists in db
            # for each control in that hazard check if it exists in db
            # return new or old for both hazard and control
            # hazard matching
            try:
                is_new = bool(get_hazard_match(hazard.hazard, knowledge_base, kb_embeddings))
            except Exception as me:
                print(f"Error matching hazard {getattr(hazard, 'hazard_id', None)}: {me}")
                is_new = False

            hazard_field = [hazard.hazard or "No hazard description", "new" if is_new else "old"]

            #risk matching
            # existing_risk_control may contain multiple controls concatenated with '&&'
            existing_risk_control_field = []
            try:
                raw_controls = (risk.existing_risk_control or "") if risk else ""
                # Split by '&&' and trim each part, ignore empty parts
                control_parts = [p.strip() for p in raw_controls.split('&&') if p and p.strip()]
                if not control_parts:
                    # No meaningful control text found
                    existing_risk_control_field = ["No risk control description", "old"]
                else:
                    for part in control_parts:
                        try:
                            is_new_part = bool(get_hazard_match(part, knowledge_base_control, kb_embeddings_control))
                        except Exception:
                            is_new_part = False
                        existing_risk_control_field.append(part)
                        existing_risk_control_field.append("new" if is_new_part else "old")
            except Exception as me:
                # Fallback: preserve the raw string if something unexpected happens
                print(f"Error processing existing_risk_control for hazard {getattr(hazard, 'hazard_id', None)}: {me}")
                existing_risk_control_field = [risk.existing_risk_control or "No risk control description", "old"]

            #activities matching
            try:
                is_new_activity = bool(get_hazard_match(activity.work_activity, knowledge_base_activity, kb_embeddings_activity))
            except Exception as me:
                print(f"Error matching activity {getattr(activity, 'activity_id', None)}: {me}")
                is_new_activity = False
            existing_activity_field = [activity.work_activity or "No activity description", "new" if is_new_activity else "old"]

            # injury matching - support multiple injuries concatenated with '&&'
            existing_injury_field = []
            try:
                raw_injuries = (hazard.injury or "") if hazard else ""
                injury_parts = [p.strip() for p in raw_injuries.split('&&') if p and p.strip()]
                if not injury_parts:
                    existing_injury_field = ["No injury description", "old"]
                else:
                    for part in injury_parts:
                        try:
                            is_new_inj = bool(get_hazard_match(part, knowledge_base_injury, kb_embeddings_injury))
                        except Exception:
                            is_new_inj = False
                        existing_injury_field.append(part)
                        existing_injury_field.append("new" if is_new_inj else "old")
            except Exception as me:
                print(f"Error processing injury for hazard {getattr(hazard, 'hazard_id', None)}: {me}")
                existing_injury_field = [hazard.injury or "No injury description", "old"]

            results.append({
                'hazard_id': hazard.hazard_id,
                'hazard_activity_id': hazard.hazard_activity_id,
                'process': process.process_title if process else "Unknown Process",
                # 'hazard': hazard.hazard or "No hazard description",
                'hazard': hazard_field,
                # 'injury': hazard.injury or "No injury description",
                'injury': existing_injury_field,
                'hazard_type_id': hazard.hazard_type_id,
                'hazard_type': hazard_type_lookup.get(hazard.hazard_type_id, "Unknown type"),
                'remarks': hazard.remarks or "No remarks",
                'approval': hazard.approval,
                # 'work_activity': activity.work_activity if activity else "Unknown activity",
                'work_activity': existing_activity_field,
                # 'hazard_type': hazard_type.hazard_type if hazard_type else "Unknown type",
                "form_title": form.title if form else "Unknown form",
                "form_date": form.last_access_date.isoformat() if form and form.last_access_date else None,
                # "owner": user.user_name if user else "Unknown user",
                # "existing_risk_control": risk.existing_risk_control if risk else "None specified",
                "existing_risk_control": existing_risk_control_field,
                "additional_risk_control": risk.additional_risk_control if risk else "None specified",
                "severity": risk.severity if risk else 0,
                "likelihood": risk.likelihood if risk else 0,
                "RPN": risk.RPN if risk else 0,
            })
        except Exception as e:
            print(f"Error processing hazard {getattr(hazard, 'hazard_id', None)}: {e}")
            continue
    
    return jsonify({'success': True, 'hazards': results})

#get approved hazards
@admin.route('/get_approved_hazard', methods=['GET', 'POST'])
def get_approved_hazard():
    hazards = Hazard.query.filter(Hazard.approval == 1).all()
    results = []
    hazard_type_lookup = {ht.hazard_type_id: getattr(ht, 'hazard_type', None) or "Unknown type" for ht in HazardType.query.all()}
    for hazard in hazards:
        try:
            # Get the related activity and hazard type using relationships
            activity = Activity.query.get(hazard.hazard_activity_id) if hazard.hazard_activity_id else None
            # hazard_type = HazardType.query.get(hazard.hazard_type_id) if hazard.hazard_type_id else None
            
            # More robust form lookup
            form = None
            process = None
            if activity and activity.activity_process_id:
                process = Process.query.get(activity.activity_process_id)
                if process and process.process_form_id:
                    form = Form.query.get(process.process_form_id)
            
            # user = User.query.get(form.form_user_id) if form and form.form_user_id else None
            risk = Risk.query.filter_by(risk_hazard_id=hazard.hazard_id).first() if hazard.hazard_id else None
            # process = Process.query.get(activity.activity_process_id)
            
            def format_date(date_obj):
                return date_obj.isoformat() if date_obj else None
            
            # form.last_access_date = format_date(form.last_access_date)
            # FIX THIS LATER !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

            # Split existing risk controls by '&&' into a list (no new/old matching here)
            try:
                raw_controls = (risk.existing_risk_control or "") if risk else ""
                existing_risk_control_list = [p.strip() for p in raw_controls.split('&&') if p and p.strip()]
                if not existing_risk_control_list:
                    existing_risk_control_list = ["No risk control description"]
            except Exception as e:
                print(f"Error splitting existing_risk_control for hazard {getattr(hazard, 'hazard_id', None)}: {e}")
                existing_risk_control_list = [risk.existing_risk_control if risk else "No risk control description"]

            # Split injuries by '&&' into a list
            try:
                raw_injuries = (hazard.injury or "") if hazard else ""
                existing_injury_list = [p.strip() for p in raw_injuries.split('&&') if p and p.strip()]
                if not existing_injury_list:
                    existing_injury_list = ["No injury description"]
            except Exception as e:
                print(f"Error splitting injury for hazard {getattr(hazard, 'hazard_id', None)}: {e}")
                existing_injury_list = [hazard.injury or "No injury description"]

            results.append({
                'hazard_id': hazard.hazard_id,
                'hazard_activity_id': hazard.hazard_activity_id,
                'process': process.process_title if process else "Unknown Process",
                'hazard': hazard.hazard or "No hazard description",
                # 'hazard': hazard_field,
                'injury': existing_injury_list,
                # 'injury': existing_injury_field,
                'hazard_type_id': hazard.hazard_type_id,
                'hazard_type': hazard_type_lookup.get(hazard.hazard_type_id, "Unknown type"),
                'remarks': hazard.remarks or "No remarks",
                'approval': hazard.approval,
                'work_activity': activity.work_activity if activity else "Unknown activity",
                # 'work_activity': existing_activity_field,
                # 'hazard_type': hazard_type.hazard_type if hazard_type else "Unknown type",
                "form_title": form.title if form else "Unknown form",
                "form_date": form.last_access_date.isoformat() if form and form.last_access_date else None,
                # "owner": user.user_name if user else "Unknown user",
                "existing_risk_control": existing_risk_control_list,
                # "existing_risk_control": existing_risk_control_field,
                "additional_risk_control": risk.additional_risk_control if risk else "None specified",
                "severity": risk.severity if risk else 0,
                "likelihood": risk.likelihood if risk else 0,
                "RPN": risk.RPN if risk else 0,
            })
        except Exception as e:
            print(f"Error processing hazard {getattr(hazard, 'hazard_id', None)}: {e}")
            continue
    
    return jsonify({'success': True, 'hazards': results})


# Endpoint to retrieve all hazard categories as id→name list
@admin.route('/hazard_types', methods=['GET'])
def get_hazard_types():
    try:
        types = HazardType.query.all()
        payload = [{'id': t.hazard_type_id, 'name': t.hazard_type} for t in types]
        return jsonify({'success': True, 'hazard_types': payload})
    except Exception as e:
        print(f"Error retrieving hazard types: {e}")
        return jsonify({'success': False, 'error': 'Failed to retrieve hazard types'}), 500

    

# In your get_users route, modify the query to join with divisions table
@admin.route('/get_users', methods=['GET'])
def get_users():
    print("\n=== GET USERS CALLED ===")
    print("Checking authentication and authorization...")
    
    try:
        # Query users with division information
        users = db.session.query(User, Division).outerjoin(
            Division, User.user_cluster == Division.division_id
        ).all()
        
        users_list = []
        
        print("\n=== USERS LIST ===")
        print("| {:<5} | {:<25} | {:<35} | {:<15} | {:<10} | {:<20} |".format(
            "ID", "Name", "Email", "Designation", "Role", "Division"
        ))
        print("|" + "-" * 7 + "|" + "-" * 27 + "|" + "-" * 37 + "|" + "-" * 17 + "|" + "-" * 12 + "|" + "-" * 22 + "|")
        
        for user, division in users:
            users_list.append({
                "user_id": user.user_id,
                "user_name": user.user_name,
                "user_email": user.user_email,
                "user_designation": user.user_designation,
                "user_role": user.user_role,
                "user_cluster": user.user_cluster,
                "division_name": division.division_name if division else "No Division"
            })
            
            # Print user details in a formatted table
            role_text = "Admin" if user.user_role == 0 else "User"
            division_name = division.division_name if division else "No Division"
            print("| {:<5} | {:<25} | {:<35} | {:<15} | {:<10} | {:<20} |".format(
                user.user_id,
                user.user_name[:23] + "..." if len(user.user_name) > 23 else user.user_name,
                user.user_email[:33] + "..." if len(user.user_email) > 33 else user.user_email,
                user.user_designation[:13] + "..." if len(user.user_designation) > 13 else (user.user_designation or "N/A"),
                role_text,
                division_name[:18] + "..." if len(division_name) > 18 else division_name
            ))
        
        print("\n=== END OF USERS LIST ===")
        print(f"Retrieved {len(users_list)} users successfully")
        return jsonify({"success": True, "users": users_list})
        
    except Exception as e:
        print(f"Error retrieving users: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": "Failed to retrieve users"}), 500

# Remove user (admin only)
@admin.route('/remove_user', methods=['POST'])
def remove_user():
    print("\n=== REMOVE USER CALLED ===")
    
    # Check if user is logged in and is an admin
    if 'user_id' not in session:
        print("No active session found")
        return jsonify({"success": False, "error": "Not authenticated"}), 401
    
    if session.get('user_role') != 0:  # 0 = admin
        print(f"Non-admin user attempted to remove a user. Role: {session.get('user_role')}")
        return jsonify({"success": False, "error": "Not authorized"}), 403
    
    data = request.get_json()
    
    if not data or 'user_id' not in data:
        return jsonify({"success": False, "error": "No user ID provided"}), 400
    
    user_id = data['user_id']
    
    try:
        # Find the user to remove
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"success": False, "error": "User not found"}), 404
        
        # Prevent removing self
        if user.user_id == session.get('user_id'):
            return jsonify({"success": False, "error": "Cannot remove your own account"}), 400
        
        print(f"Removing user: {user.user_name} (ID: {user.user_id})")
        
        # Store user_id before deletion for audit log
        deleted_user_id = user.user_id
        
        # Log the user removal action to audit table BEFORE deleting the user
        # This ensures the target user still exists when creating the audit log
        create_audit_log(session['user_id'], "DELETE - remove user", deleted_user_id)
        
        # Remove the user
        db.session.delete(user)
        db.session.commit()
        
        print(f"User {user.user_name} (ID: {deleted_user_id}) removed successfully")
        return jsonify({"success": True})
        
    except Exception as e:
        print(f"Error removing user: {str(e)}")
        db.session.rollback()
        return jsonify({"success": False, "error": "Failed to remove user"}), 500

# Reset user password (admin only)
@admin.route('/reset_password', methods=['POST'])
def reset_password():
    print("\n=== RESET PASSWORD CALLED ===")
    
    # Check if user is logged in and is an admin
    if 'user_id' not in session:
        print("No active session found")
        return jsonify({"success": False, "error": "Not authenticated"}), 401
    
    if session.get('user_role') != 0:  # 0 = admin
        print(f"Non-admin user attempted to reset a password. Role: {session.get('user_role')}")
        return jsonify({"success": False, "error": "Not authorized"}), 403
    
    data = request.get_json()
    
    if not data or 'user_id' not in data or 'new_password' not in data:
        return jsonify({"success": False, "error": "Missing required fields"}), 400
    
    try:
        # Find the user to update
        user = User.query.get(data['user_id'])
        
        if not user:
            return jsonify({"success": False, "error": "User not found"}), 404
        
        print(f"Resetting password for user: {user.user_name} (ID: {user.user_id})")
        
        # Hash the new password before saving
        hashed_password = generate_password_hash(data['new_password'])
        user.password = hashed_password
        
        # Save changes
        db.session.commit()
        
        # Log the password reset action to audit table
        create_audit_log(session['user_id'], "UPDATE - reset password", user.user_id)
        
        print(f"Password reset successful for user: {user.user_name} (ID: {user.user_id})")
        return jsonify({
            "success": True,
            "message": "Password reset successful"
        })
        
    except Exception as e:
        print(f"Error resetting password: {str(e)}")
        db.session.rollback()
        return jsonify({"success": False, "error": f"Failed to reset password: {str(e)}"}), 500
        
@admin.route('/retrieveDivisions', methods=['GET'])
def retrieve_divisions():
    try:
        divisions = Division.query.all()
        divisions_data = []
        for division in divisions:
            divisions_data.append({
                'division_id': division.division_id,
                'division_name': division.division_name
            })
        return jsonify(divisions_data)

    except Exception as e:
        print(f"Error retrieving divisions: {e}")
        return jsonify({'error': 'Failed to retrieve divisions'}), 500     
    
    
# Add user (admin only)
@admin.route('/add_user', methods=['POST'])
def add_user():
    print("\n=== ADD USER CALLED ===")
    
    data = request.get_json()
    print(f"Received data: {data}")  # Debug what you're getting

    if data:
        print(f"Keys in data: {list(data.keys())}")
        print(f"Has user_name: {'fullName' in data}")
        print(f"Has user_email: {'email' in data}")
        print(f"Has password: {'password' in data}")
        print(f"Has account type: {'accountType' in data}")
        print(f"Has programme cluster: {'programmeCluster' in data}")
        print(f"cluster:",data['programmeCluster'])
    else:
        print("No data received or data is None")

    if not data or 'fullName' not in data or 'email' not in data or 'password' not in data:
        return jsonify({"success": False, "error": "Missing required fields"}), 400
    
    if not data.get('programmeCluster', '').strip():
        return jsonify({"success": False, "error": "Cluster or Division must be selected"}), 400
    
    # Check if email already exists
    existing_user = User.query.filter_by(user_email=data['email']).first()
    if existing_user:
        return jsonify({"success": False, "error": "Email already in use"}), 400
    
    try:
        print(f"Creating new user: {data['fullName']} ({data['email']})")
        
        # Hash the password before saving
        hashed_password = generate_password_hash(data['password'])
        
        # Create new user - adjust this according to your User model
        new_user = User(
            user_name=data['fullName'],
            user_email=data['email'],
            password=hashed_password,  # Store hashed password
            user_designation='student',
            user_role=data['accountType'],  
            user_cluster=data['programmeCluster']
        )
        
        db.session.add(new_user)
        db.session.commit()
        
        # Log the user creation action to audit table
        create_audit_log(session['user_id'], "POST - add user", new_user.user_id)
        
        print(f"New user created: {new_user.user_name} (ID: {new_user.user_id})")
        # Fetch division name for the new user
        division = Division.query.filter_by(division_id=new_user.user_cluster).first()
        division_name = division.division_name if division else "No Division"
        return jsonify({
            "success": True,
            "user": {
                "user_id": new_user.user_id,
                "user_name": new_user.user_name,
                "user_email": new_user.user_email,
                "user_designation": new_user.user_designation,
                "user_role": new_user.user_role,
                "user_cluster": new_user.user_cluster,
                "division_name": division_name
            }
        })
        
    except Exception as e:
        print(f"Error creating user: {str(e)}")
        db.session.rollback()
        return jsonify({"success": False, "error": "Failed to create user"}), 500    
@admin.route('/update_user', methods=['POST'])
def update_user():
    print("\n=== UPDATE USER CALLED ===")
    
    # Check if user is logged in and is an admin
    if 'user_id' not in session:
        print("No active session found")
        return jsonify({"success": False, "error": "Not authenticated"}), 401
    
    if session.get('user_role') != 0:  # 0 = admin
        print(f"Non-admin user attempted to update a user. Role: {session.get('user_role')}")
        return jsonify({"success": False, "error": "Not authorized"}), 403
    
    data = request.get_json()
    
    if not data or 'user_id' not in data:
        return jsonify({"success": False, "error": "No user ID provided"}), 400
    
    try:
        # Find the user to update
        user = User.query.get(data['user_id'])
        
        if not user:
            return jsonify({"success": False, "error": "User not found"}), 404
        
        print(f"Updating user: {user.user_name} (ID: {user.user_id})")
        
        # Update user details
        if 'user_name' in data:
            user.user_name = data['user_name']
        
        if 'user_email' in data:
            # Check if email already exists for another user
            existing_user = User.query.filter(User.user_email == data['user_email'], User.user_id != user.user_id).first()
            if existing_user:
                return jsonify({"success": False, "error": "Email already in use by another user"}), 400
            
            user.user_email = data['user_email']
        
        if 'user_designation' in data:
            user.user_designation = data['user_designation']
        
        if 'user_role' in data:
            # Prevent removing the last admin
            if user.user_role == 0 and data['user_role'] != 0:
                # Count how many admins we have
                admin_count = User.query.filter_by(user_role=0).count()
                if admin_count <= 1:
                    return jsonify({"success": False, "error": "Cannot change the last admin to a regular user"}), 400
            
            user.user_role = data['user_role']
                
        if 'user_cluster' in data:
            print(f"Updating cluster for user {user.user_id}:")
            print(f"  - Current cluster: {user.user_cluster} (type: {type(user.user_cluster)})")
            print(f"  - New cluster: {data['user_cluster']} (type: {type(data['user_cluster'])})")
            
            # Handle various formats
            if data['user_cluster'] == "":
                print("  - Setting cluster to None (empty string received)")
                user.user_cluster = None
            else:
                print(f"  - Setting cluster to: {data['user_cluster']}")
                user.user_cluster = data['user_cluster']
            
            print(f"  - Updated cluster value: {user.user_cluster} (type: {type(user.user_cluster)})")
        else:
            print("No cluster update requested (user_cluster not in data)")        
        # Save changes
        db.session.commit()
        
        # Log the user update action to audit table
        create_audit_log(session['user_id'], "UPDATE - edit user details", user.user_id)
        
        print(f"User {user.user_name} (ID: {user.user_id}) updated successfully")
        return jsonify({
            "success": True,
            "user": {
                "user_id": user.user_id,
                "user_name": user.user_name,
                "user_email": user.user_email,
                "user_designation": user.user_designation,
                "user_role": user.user_role,
                "user_cluster": user.user_cluster
            }
        })
        
    except Exception as e:
        print(f"Error updating user: {str(e)}")
        db.session.rollback()
        return jsonify({"success": False, "error": "Failed to update user"}), 500
    
#Route for retrieving all user created forms
@admin.route('/retrieveForms', methods=['GET'])
def retrieve_forms():
    print(f"RETRIEVING ALL USER FORMS AS ADMIN")

    try:
        print("=== Retrieve Forms Debug ===")
        print(f"Session data: {session}")
        print(f"Session data: {session.get('user_id')}")

        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 21, type=int)  # Default 21 per page
        
        # Optional: Add search/filter parameters
        search = request.args.get('search', '', type=str)
        status_filter = request.args.get('status', '', type=str)
        division_filter = request.args.get('division', '', type=str)
        user_filter = request.args.get('user_id', '', type=str)  # Filter by user_id

        query = db.session.query(Form, User).join(
            User, Form.form_user_id == User.user_id
        )

        # Apply filters if provided
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                db.or_(
                    Form.title.ilike(search_term),
                    Form.form_reference_number.ilike(search_term),
                    User.user_name.ilike(search_term),
                    Form.location.ilike(search_term),
                    Form.process.ilike(search_term)
                )
            )

        if division_filter:
            query = query.filter(Form.division == division_filter)
        
        # Filter by user_id if provided
        if user_filter:
            query = query.filter(Form.form_user_id == int(user_filter))

        all_forms_with_users = query.all()

        # Filter by status if specified
        filtered_forms = []
        for form, user in all_forms_with_users:
            # Create status based on approval and dates
            status = "Incomplete"  # Default status
            if form.approval == 1:
                status = "Completed"
                print(f"status:", status)

            # Check if review is due
            if form.next_review_date:
                from datetime import datetime
                if form.next_review_date < datetime.now():
                    status = "review due"
            
            # Apply status filter
            if status_filter and status.lower() != status_filter.lower():
                continue
                
            filtered_forms.append((form, user, status))

        # Apply pagination to filtered results
        total_forms = len(filtered_forms)
        total_pages = ceil(total_forms / per_page)
        
        # Calculate pagination bounds
        start_index = (page - 1) * per_page
        end_index = start_index + per_page
        paginated_forms = filtered_forms[start_index:end_index]

        print(f"Total forms after filtering: {total_forms}, Current page forms: {len(paginated_forms)}")

        forms_list = []
        for form, user, status in paginated_forms:

            def format_date(date_obj):
                return date_obj.isoformat() if date_obj else None
            
            # Get approved_by username if available
            approved_by_username = None
            if form.approved_by:
                approved_by_user = User.query.filter_by(user_id=form.approved_by).first()
                approved_by_username = approved_by_user.user_name if approved_by_user else f"User ID: {form.approved_by}"
            
            # Get division name if available
            division_name = None
            if form.division:
                division_obj = Division.query.filter_by(division_id=form.division).first()
                division_name = division_obj.division_name if division_obj else f"Division ID: {form.division}"

            forms_list.append({
                'id': form.form_id,
                'title': form.title or "Untitled Form",
                'form_reference_number': form.form_reference_number,
                'location': form.location,
                'division': division_name,
                'division_id': form.division,
                'process': form.process,
                'status': status,
                'approval': form.approval,
                'created_at': format_date(form.last_access_date),  # Using last_access_date as created_at
                'last_access_date': format_date(form.last_access_date),
                'last_review_date': format_date(form.last_review_date),
                'next_review_date': format_date(form.next_review_date),
                'form_user_id': form.form_user_id,
                'form_RA_team_id': form.form_RA_team_id,
                'approved_by': form.approved_by,
                'approved_by_username': approved_by_username,
                'owner': user.user_name,  # Username of the form creator
                'owner_email': user.email if hasattr(user, 'email') else None,  # Add email if available
                # 'owner_department': user.department if hasattr(user, 'department') else None  # Add department if available
            })

        has_next = page < total_pages
        has_prev = page > 1

        response_data = {
            'forms': forms_list,
            'pagination': {
                'current_page': page,
                'per_page': per_page,
                'total_forms': total_forms,
                'total_pages': total_pages,
                'has_next': has_next,
                'has_prev': has_prev,
                'next_page': page + 1 if has_next else None,
                'prev_page': page - 1 if has_prev else None,
                'start_index': start_index + 1 if total_forms > 0 else 0,
                'end_index': min(end_index, total_forms)
            },
            'filters': {
                'search': search,
                'status': status_filter,
                'division': division_filter
            }
        }

        print(f"Returning page {page} with {len(forms_list)} forms")
        
        # Create response with no-cache headers
        response = make_response(jsonify(response_data))
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        
        return response
    
        # Sort by creation date (newest first) or by username
        # forms_list.sort(key=lambda x: x['created_at'] or '', reverse=True)

        # print(f"Returning {len(forms_list)} forms")
        # return jsonify(forms_list)
     
    except Exception as e:
        print(f"Error retrieving forms: {e}")
        return jsonify({'error': 'Failed to retrieve forms'}), 500
    
@admin.route('/downloadForm/<int:form_id>', methods=['GET'])
def download_form(form_id):
    print(f"downloading form with id:", form_id)
    return jsonify({'success': 'Downloading form'}), 200
    

@admin.route('/deleteForm/<int:form_id>', methods=['DELETE'])
def delete_form(form_id):
    try:
        # Find the process
        form = Form.query.get(form_id)
        print(f"form process to be deleted found:", form)
        if not form:
            return jsonify({'error': 'Form not found'}), 404
        
        # Delete all processes and activities associated with the form
        processes = Process.query.filter_by(process_form_id=form_id).all()
        for process in processes:
            # Delete all activities associated with this process
            activities = Activity.query.filter_by(activity_process_id=process.process_id).all()
        
            for activity in activities:
                # Delete hazards associated with this activity
                hazards = Hazard.query.filter_by(hazard_activity_id=activity.activity_id).all()
            
                for hazard in hazards:
                    # Delete risks associated with this hazard
                    Risk.query.filter_by(risk_hazard_id=hazard.hazard_id).delete()
                
                # Delete the hazards
                Hazard.query.filter_by(hazard_activity_id=activity.activity_id).delete()
            
            # Delete the activities
            Activity.query.filter_by(activity_process_id=process.process_id).delete()
        
            # Finally, delete the process
            db.session.delete(process)
        db.session.delete(form)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Form {form_id} and all associated data deleted successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting form {form_id}: {str(e)}")
        return jsonify({'error': 'Failed to delete process'}), 500


@admin.route('/getRaLeader/<int:ra_team_id>', methods=['GET'])
def get_ra_leader(ra_team_id):
    """Get the RA leader name for a given RA team ID"""
    try:
        print(f"Fetching RA leader for team ID: {ra_team_id}")
        
        # Get the RA team
        ra_team = RA_team.query.filter_by(RA_team_id=ra_team_id).first()
        
        if not ra_team:
            return jsonify({
                'success': False,
                'error': 'RA team not found'
            }), 404
        
        # Get the leader user
        leader = User.query.filter_by(user_id=ra_team.RA_leader).first()
        
        if not leader:
            return jsonify({
                'success': False,
                'error': 'RA leader not found'
            }), 404
        
        return jsonify({
            'success': True,
            'ra_leader_name': leader.user_name,
            'ra_leader_id': leader.user_id
        }), 200
        
    except Exception as e:
        print(f"Error fetching RA leader for team {ra_team_id}: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@admin.route('/get_audit_logs', methods=['GET'])
def get_audit_logs():
    """Get all audit logs with user information"""
    print("\n=== GET AUDIT LOGS CALLED ===")
    
    try:
        # Query all audit logs with joins to get user names
        audits = db.session.query(Audit, User).join(
            User, Audit.audit_user == User.user_id
        ).order_by(Audit.audit_time.desc()).all()
        
        audit_list = []
        
        for audit, user in audits:
            # audit_targetuser now stores the user name directly
            target_user_name = audit.audit_targetuser
            
            # Format the time
            audit_time = audit.audit_time.isoformat() if audit.audit_time else None
            
            audit_list.append({
                'audit_id': audit.audit_id,
                'audit_user_id': audit.audit_user,
                'audit_user_name': user.user_name,
                'audit_action': audit.audit_action,
                'audit_actiontype': audit.audit_actiontype,
                'audit_targetuser_name': target_user_name,
                'audit_time': audit_time
            })
        
        print(f"Retrieved {len(audit_list)} audit logs")
        return jsonify({
            'success': True,
            'audits': audit_list
        })
        
    except Exception as e:
        print(f"Error retrieving audit logs: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': 'Failed to retrieve audit logs'
        }), 500
        

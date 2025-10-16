# Fix the import statements
from flask import Blueprint, jsonify, request, session, make_response
from werkzeug.security import generate_password_hash
from models import User, Form, Activity, Process, Hazard, Risk, HazardType, Division
from models import db
import random
import string
from flask_cors import CORS, cross_origin
from math import ceil
from .rag import *


# Create a new blueprint for admin routes
admin = Blueprint('admin', __name__)
CORS(admin, supports_credentials=True)  # Enable credentials support for cookies

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

    # add the data into the known data table
    try:
        new_known_data = KnownData(
            title = data.get("form_title"),
            process = data.get("process"),
            activity_name=data.get("work_activity"),
            hazard_type=data.get("hazard_type"),
            hazard_des=data.get("hazard"),
            injury=data.get("injury"),
            control=data.get("existing_risk_control"),
            severity=int(data.get("severity")),
            likelihood=int(data.get("likelihood")),
            rpn=int(data.get("RPN"))
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
            f.write(f"&&{data.get('work_activity')}")
        print("Success: Activity name appended to kb.txt")
        reembed_kb()
        print("Success: reembed_kb() called")
    except Exception as e:
        print(f"Error updating kb.txt or reembedding: {e}")
        return jsonify({"success": False, "message": "Failed to update kb.txt"}), 500

    # add hazard des into kbhazard.txt and reembed it
    try:
        with open(os.path.join(os.path.dirname(__file__), 'kbhazard.txt'), 'a') as f:
            f.write(f"&&{data.get('hazard')}")
        print("Success: Hazard description appended to kbhazard.txt")
        reembed_kbhazard()
        print("Success: reembed_kbhazard() called")
    except Exception as e:
        print(f"Error updating kbhazard.txt or reembedding: {e}")
        return jsonify({"success": False, "message": "Failed to update kbhazard.txt"}), 500
    
    # add form and process into kbtitleprocess.txt and reembed it
    try:
        with open(os.path.join(os.path.dirname(__file__), 'kbtitleprocess.txt'), 'a') as f:
            f.write(f"&&{data.get('form_title')}%%{data.get('process')}")
        print("Success: appended to kbtitleprocess.txt")
        reembed_kbtitleprocess()
        print("Success: reembed_kbtitleprocess() called")
    except Exception as e:
        print(f"Error updating kbtitleprocess.txt or reembedding: {e}")
        return jsonify({"success": False, "message": "Failed to update kbtitleprocess.txt"}), 500

    print("Hazard approval process completed successfully")
    return jsonify({"success": True, "message": "Hazard approved", "hazard_id": data.get("hazard_id")})

#db management gold mine
@admin.route('/get_new_hazard', methods=['GET', 'POST'])
def get_new_hazard():
    # Query all hazards where approval is NULL
    knowledge_base, kb_embeddings = load_hazard_kb_and_embeddings()
    knowledge_base_control, kb_embeddings_control = load_control_kb_and_embeddings()
    # hazards = Hazard.query.filter(Hazard.approval == None).all()
    hazards = Hazard.query.filter(Hazard.approval.is_(None), Hazard.ai == 'ai').all()
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
    for hazard in matched_hazards:
        try:
            # Get the related activity and hazard type using relationships
            activity = Activity.query.get(hazard.hazard_activity_id) if hazard.hazard_activity_id else None
            # hazard_type = HazardType.query.get(hazard.hazard_type_id) if hazard.hazard_type_id else None
            
            # More robust form lookup
            form = None
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
            try:
                is_new = bool(get_hazard_match(hazard.hazard, knowledge_base, kb_embeddings))
            except Exception as me:
                print(f"Error matching hazard {getattr(hazard, 'hazard_id', None)}: {me}")
                is_new = False

            hazard_field = [hazard.hazard or "No hazard description", "new" if is_new else "old"]

            try:
                is_new_control = bool(get_hazard_match(risk.existing_risk_control, knowledge_base_control, kb_embeddings_control))
            except Exception as me:
                # print(f"Error matching hazard {getattr(hazard, 'hazard_id', None)}: {me}")
                is_new_control = False
            existing_risk_control_field = [risk.existing_risk_control or "No risk control description", "new" if is_new_control else "old"]

            results.append({
                'hazard_id': hazard.hazard_id,
                'hazard_activity_id': hazard.hazard_activity_id,
                'process': process.process_title if process else "Unknown Process",
                # 'hazard': hazard.hazard or "No hazard description",
                'hazard': hazard_field,
                'injury': hazard.injury or "No injury description",
                'hazard_type_id': hazard.hazard_type_id,
                'remarks': hazard.remarks or "No remarks",
                'approval': hazard.approval,
                'work_activity': activity.work_activity if activity else "Unknown activity",
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
            print(f"Error processing hazard {hazard.hazard_id}: {str(e)}")
            continue
    
    return jsonify({'success': True, 'hazards': results})

    

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
        
        # Remove the user
        db.session.delete(user)
        db.session.commit()
        
        print(f"User {user.user_name} (ID: {user.user_id}) removed successfully")
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

            forms_list.append({
                'id': form.form_id,
                'title': form.title or "Untitled Form",
                'form_reference_number': form.form_reference_number,
                'location': form.location,
                'division': form.division,
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
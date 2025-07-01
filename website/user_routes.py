from flask import Blueprint, jsonify, request, session
from flask_cors import CORS
from werkzeug.security import generate_password_hash
from models import User, Form, Activity, Process, Hazard, Risk, HazardType, KnownData
from . import db
import random
import string
from flask_cors import CORS, cross_origin
from datetime import datetime
import json
from .rag import *

# Create a new blueprint for user routes
user = Blueprint('user', __name__,static_folder='static')
CORS(user, supports_credentials=True)  # Enable credentials support for cookies

#Route for retrieving user forms
@user.route('/retrieveForms', methods=['GET'])
def retrieve_forms():
    print(f"RETRIEVING USER FORMS")

    try:
        print("=== Retrieve Forms Debug ===")
        print(f"Session data: {session}")
        print(f"Session data: {session.get('user_id')}")

        session_user_id = session.get('user_id')
        
        print(f"Form model: {Form}")

        user = User.query.filter_by(user_id=session_user_id).first()
        username = user.user_name if user else "Unknown User"

        print(f"username:", username)

        forms = Form.query.filter_by(form_user_id=session_user_id).all()

        print(f"Forms:", forms)

        forms_list = []
        for form in forms:

            def format_date(date_obj):
                return date_obj.isoformat() if date_obj else None
            
            # Create status based on approval and dates
            status = "Incomplete"
            if form.approval == 1:
                status = "Completed"


            # Check if review is due
            if form.next_review_date:
                from datetime import datetime
                if form.next_review_date < datetime.now():
                    status = "Review Due"


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
                'owner': username  # Add username to the response
            })

        return jsonify(forms_list)
     
    except Exception as e:
        print(f"Error retrieving forms: {e}")
        return jsonify({'error': 'Failed to retrieve forms'}), 500

@user.route('/process/<int:process_id>', methods=['DELETE'])
def delete_process(process_id):
    try:
        # Find the process
        process = Process.query.get(process_id)
        print(f"backend process to be deleted found:", process)
        if not process:
            return jsonify({'error': 'Process not found'}), 404
        
        # Delete all activities associated with this process
        # This will also cascade to delete hazards and risks if you have proper foreign key constraints
        activities = Activity.query.filter_by(activity_process_id=process_id).all()
        
        for activity in activities:
            # Delete hazards associated with this activity
            hazards = Hazard.query.filter_by(hazard_activity_id=activity.activity_id).all()
            
            for hazard in hazards:
                # Delete risks associated with this hazard
                Risk.query.filter_by(risk_hazard_id=hazard.hazard_id).delete()
                
            # Delete the hazards
            Hazard.query.filter_by(hazard_activity_id=activity.activity_id).delete()
            
        # Delete the activities
        Activity.query.filter_by(activity_process_id=process_id).delete()
        
        # Finally, delete the process
        db.session.delete(process)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Process {process_id} and all associated data deleted successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting process {process_id}: {str(e)}")
        return jsonify({'error': 'Failed to delete process'}), 500

     
@user.route('/process', methods=['POST'])
def save_process():
    try:
        data = request.get_json()

        # Extract data from request
        process_form_id = data.get('process_form_id')
        process_number = data.get('process_number')
        process_title = data.get('process_title')
        process_location = data.get('process_location')
        process_id = data.get('process_id')  # For updates

        # Validate required fields
        if not process_form_id or not process_title:
            return jsonify({'error': 'Missing required fields'}), 400
        
        if process_id:
            # Update existing process
            process = Process.query.get(process_id)
            if not process:
                return jsonify({'error': 'Process not found'}), 404
            
            process.process_form_id = process_form_id
            process.process_number = process_number
            process.process_title = process_title
            process.process_location = process_location
            
            action = 'updated'

        else:
            # Create new process
            process = Process(
                process_form_id=process_form_id,
                process_number=process_number,
                process_title=process_title,
                process_location=process_location
            )
            db.session.add(process)
            action = 'created'
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'action': action,
            'process_id': process.process_id,
            'message': f'Process {action} successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error saving process: {str(e)}")
        return jsonify({'error': 'Failed to save process'}), 500
    
#API Route for saving activity
@user.route('/activity', methods=['POST'])
def save_activity():
    try:
        data = request.get_json()

        activity_process_id = data.get('activity_process_id')
        work_activity = data.get('work_activity')
        activity_number = data.get('activity_number')
        activity_id = data.get('activity_id')  # For updates
        activity_remarks = data.get('activity_remarks')

        # Validate required fields
        if not activity_process_id or not work_activity:
            return jsonify({'error': 'Missing required fields'}), 400
        
        if activity_id:
            # Update existing activity
            activity = Activity.query.get(activity_id)
            if not activity:
                return jsonify({'error': 'Activity not found'}), 404
            
            activity.activity_process_id = activity_process_id
            activity.work_activity = work_activity
            activity.activity_number = activity_number
            activity.activity_remarks = activity_remarks
            
            action = 'updated'
        else:
            # Create new activity
            activity = Activity(
                activity_process_id=activity_process_id,
                work_activity=work_activity,
                activity_number=activity_number,
                activity_remarks=activity_remarks
            )
            db.session.add(activity)
            action = 'created'
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'action': action,
            'activity_id': activity.activity_id,
            'message': f'Activity {action} successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error saving activity: {str(e)}")
        return jsonify({'error': 'Failed to save activity'}), 500

@user.route('/form1', methods=['POST'])
def form1_save():
    print("\nSAVE FORM 1 CALLED")

    data = request.get_json()
    print(f"Received data: {data}")  # Debug what you're getting

    userid = data.get('userId')
    print(f"current user id:", userid)

    if (not data or 
            not data.get('title') or 
            not data.get('division')):
            return jsonify({"success": False, "error": "Missing required fields"}), 400
    
    try:
        form_id = data.get('form_id')
        title = data.get('title')
        division = data.get('division')
        current_time = datetime.now()

        if form_id:
            form = Form.query.get(form_id)
            if not form:
                return jsonify({"error": "Form not Found"}), 404
            print(f"Updating existing form with ID: {form_id}")
            form.title = title
            form.division = division

            action = 'updated'
        else:
            form = Form(
                title=title,
                division=division,
            )
            form.form_user_id = userid
            db.session.add(form)
            action = 'created'
        
        form.last_access_date = current_time  # Set last access date to current time


        db.session.commit()

        # Store form_id in session for persistence across tabs
        session['current_form_id'] = form.form_id

        return jsonify({
            "success": True,
            "form_id": form.form_id,    
            "message": "Form saved successfully",
            "action": "updated" if form_id else "created",
            "last_access_date": form.last_access_date.isoformat(),  # Return the timestamp
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
  
@user.route('/get_form2_data/<int:form_id>', methods=['GET'])
def get_form2_data(form_id):
    # Fetch the form
    form = Form.query.get(form_id)
    
    if not form:
        return jsonify({"error": "Form not found"}), 404
    
    # Fetch processes associated with this form
    processes = Process.query.filter_by(process_form_id=form_id).all()
    
    # Build the response with processes, activities, hazards and risks
    response_data = {
        "form_id": form.form_id,
        "title": form.title,
        "division": form.division,
        "processes": []
    }
    
    for process in processes:
        proc_data = {
            "process_id": process.process_id,
            "id": process.process_id,
            "processNumber": process.process_number,
            "header": process.process_title,
            "location": process.process_location,
            "activities": []
        }
        
        # Get activities for this process
        activities = Activity.query.filter_by(activity_process_id=process.process_id).all()
        
        for activity in activities:
            act_data = {
                "activity_id": activity.activity_id,
                "id": activity.activity_id,
                "description": activity.work_activity,
                "remarks": activity.remarks,
                "hazards": []
            }
            
            # Get hazards for this activity
            hazards = Hazard.query.filter_by(hazard_activity_id=activity.activity_id).all()
            
            for hazard in hazards:
                # Get risk information for this hazard
                risk = Risk.query.filter_by(risk_hazard_id=hazard.hazard_id).first()
                
                # Get hazard type
                hazard_type = HazardType.query.get(hazard.hazard_type_id)
                hazard_type_name = hazard_type.hazard_type if hazard_type else ""
                
                hazard_data = {
                    "hazard_id": hazard.hazard_id,
                    "id": hazard.hazard_id,
                    "description": hazard.hazard,
                    "type": [hazard_type_name] if hazard_type_name else [],
                    "injuries": [hazard.injury] if hazard.injury else [],
                    "existingControls": risk.existing_risk_control if risk else "",
                    "additionalControls": risk.additional_risk_control if risk else "",
                    "severity": risk.severity if risk else 1,
                    "likelihood": risk.likelihood if risk else 1,
                    "rpn": risk.RPN if risk else 1
                }
                
                act_data["hazards"].append(hazard_data)
            
            # If no hazards, add a default empty one
            if not act_data["hazards"]:
                act_data["hazards"] = []
            
            proc_data["activities"].append(act_data)
        
        response_data["processes"].append(proc_data)
    
    # Also get hazard types list
    hazard_types = HazardType.query.all()
    response_data["hazardTypesList"] = [ht.hazard_type for ht in hazard_types]
    
    return jsonify(response_data)

@user.route('/hazard_types', methods=['GET'])
def get_hazard_types():
    """Get all available hazard types for use in dropdown menus"""
    try:
        hazard_types = HazardType.query.all()
        hazard_types_list = [{'id': ht.hazard_type_id, 'type': ht.hazard_type} for ht in hazard_types]
        
        return jsonify({
            "success": True,
            "hazard_types": hazard_types_list
        }), 200
        
    except Exception as e:
        print(f"Error fetching hazard types: {str(e)}")
        return jsonify({"error": str(e)}), 500

@user.route('/form2', methods=['POST'])
def form2_save():
    print("\nSAVE FORM 2 CALLED")
    
    try:
        data = request.get_json()
        print(f"Received form2 data: {data}")
        
        # Get user ID
        userid = data.get('userId')
        if not userid:
            return jsonify({"error": "User ID is required"}), 400
            
        # Validate required fields
        if (not data or 
                not data.get('title') or 
                not data.get('division') or 
                not data.get('processes')):
                return jsonify({"success": False, "error": "Missing required fields"}), 400
        
        new_hazard_types = set()
        for proc_data in data.get('processes', []):
            for act_data in proc_data.get('activities', []):
                for haz_data in act_data.get('hazards', []):
                    for hazard_type in haz_data.get('type', []):
                        if hazard_type and hazard_type.strip():
                            new_hazard_types.add(hazard_type.strip())
        
        # Check which types need to be added to the database
        for type_name in new_hazard_types:
            # Check if this type already exists
            existing_type = HazardType.query.filter_by(hazard_type=type_name).first()
            if not existing_type:
                print(f"Creating new hazard type: {type_name}")
                new_type = HazardType(
                    hazard_type=type_name,
                    hazard_approval=0,  # Default to no approval needed
                    hazard_approval_by=None  # No approver by default
                )
                db.session.add(new_type)
        
        # Flush session to get IDs for the new hazard types
        db.session.flush()
        
        # Check if updating existing form
        form_id = data.get('form_id')
        
        if form_id:
            form = Form.query.get(form_id)
            if not form:
                return jsonify({"error": "Form not found"}), 404
            print(f"Updating existing form with ID: {form_id}")
        else:
            # Create new form
            form = Form()
            form.form_user_id = userid
            form.form_RA_team_id = userid  # Set default RA team to user for now
            form.last_access_date = datetime.now()
            db.session.add(form)
            db.session.flush()  # Get the form_id before committing
        
        # Update form fields
        form.title = data['title']
        form.division = data['division']
        
        # Track existing resources to delete removed ones
        existing_processes = Process.query.filter_by(process_form_id=form.form_id).all()
        existing_process_ids = [p.process_id for p in existing_processes]
        updated_process_ids = []
        
        # Process each process and its activities/hazards
        for proc_data in data['processes']:
            proc_id = proc_data.get('id')
            
            # Find or create process
            if isinstance(proc_id, int):  # Only integers are valid DB IDs
                process = Process.query.get(proc_id)
                if process and process.process_form_id == form.form_id:
                    updated_process_ids.append(process.process_id)
                else:
                    process = None
            else:
                process = None
                
            if not process:
                process = Process()
                process.process_form_id = form.form_id
                db.session.add(process)
            
            # Update process data
            process.process_number = proc_data.get('processNumber')
            process.process_title = proc_data.get('header', '')
            process.process_location = proc_data.get('location', '')
            
            db.session.flush()  # Ensure process ID is available
            
            # Track existing activities
            existing_activities = Activity.query.filter_by(
                activity_process_id=process.process_id
            ).all()
            existing_activity_ids = [a.activity_id for a in existing_activities]
            updated_activity_ids = []
            
            # Process activities
            for act_data in proc_data.get('activities', []):
                act_id = act_data.get('id')
                
                # Find or create activity
                if isinstance(act_id, int):  # Only integers are valid DB IDs
                    activity = Activity.query.get(act_id)
                    if activity and activity.activity_process_id == process.process_id:
                        updated_activity_ids.append(activity.activity_id)
                    else:
                        activity = None
                else:
                    activity = None
                    
                if not activity:
                    activity = Activity()
                    activity.activity_process_id = process.process_id
                    db.session.add(activity)
                
                # Update activity data
                activity.work_activity = act_data.get('description', '')
                activity.activity_number = act_data.get('activityNumber', 1)
                
                db.session.flush()  # Ensure activity ID is available
                
                # Track existing hazards
                existing_hazards = Hazard.query.filter_by(
                    hazard_activity_id=activity.activity_id
                ).all()
                existing_hazard_ids = [h.hazard_id for h in existing_hazards]
                updated_hazard_ids = []
                
                # Process hazards
                for haz_data in act_data.get('hazards', []):
                    haz_id = haz_data.get('id')
                    
                    # Find or create hazard
                    if isinstance(haz_id, int):  # Only integers are valid DB IDs
                        hazard = Hazard.query.get(haz_id)
                        if hazard and hazard.hazard_activity_id == activity.activity_id:
                            updated_hazard_ids.append(hazard.hazard_id)
                        else:
                            hazard = None
                    else:
                        hazard = None
                        
                    if not hazard:
                        hazard = Hazard()
                        hazard.hazard_activity_id = activity.activity_id
                        db.session.add(hazard)
                    
                    # Update hazard data
                    hazard.hazard = haz_data.get('description', '')
                    
                    # Handle hazard type
                    hazard_type = haz_data.get('type', [])
                    if hazard_type and len(hazard_type) > 0:
                        # Find or create the hazard type
                        hazard_type_name = hazard_type[0]
                        hazard_type_obj = HazardType.query.filter_by(hazard_type=hazard_type_name).first()
                        if not hazard_type_obj:
                            hazard_type_obj = HazardType(hazard_type=hazard_type_name)
                            db.session.add(hazard_type_obj)
                            db.session.flush()
                        
                        hazard.hazard_type_id = hazard_type_obj.hazard_type_id
                    
                    # Handle injuries - store as comma-separated string
                    injuries = haz_data.get('injuries', [])
                    hazard.injury = ','.join(injuries) if injuries else ''
                    
                    db.session.flush()  # Ensure hazard ID is available
                    
                    # Find or create risk
                    risk = Risk.query.filter_by(risk_hazard_id=hazard.hazard_id).first()
                    if not risk:
                        risk = Risk()
                        risk.risk_hazard_id = hazard.hazard_id
                        db.session.add(risk)
                    
                    # Update risk data
                    risk.existing_risk_control = haz_data.get('existingControls', '')
                    risk.additional_risk_control = haz_data.get('additionalControls', '')
                    risk.severity = haz_data.get('severity', 1)
                    risk.likelihood = haz_data.get('likelihood', 1)
                    risk.RPN = risk.severity * risk.likelihood
                    risk.risk_rating = risk.RPN  # Set risk_rating based on RPN
                    
                    db.session.flush()
                
                # Delete hazards that were removed
                for haz_id in existing_hazard_ids:
                    if haz_id not in updated_hazard_ids:
                        # Delete associated risks first
                        Risk.query.filter_by(risk_hazard_id=haz_id).delete()
                        # Then delete the hazard
                        Hazard.query.filter_by(hazard_id=haz_id).delete()
            
            # Delete activities that were removed
            for act_id in existing_activity_ids:
                if act_id not in updated_activity_ids:
                    # Delete associated hazards first
                    hazards_to_delete = Hazard.query.filter_by(hazard_activity_id=act_id).all()
                    for hazard in hazards_to_delete:
                        Risk.query.filter_by(risk_hazard_id=hazard.hazard_id).delete()
                    
                    Hazard.query.filter_by(hazard_activity_id=act_id).delete()
                    Activity.query.filter_by(activity_id=act_id).delete()
        
        # Delete processes that were removed
        for proc_id in existing_process_ids:
            if proc_id not in updated_process_ids:
                # Get all activities for this process
                activities_to_delete = Activity.query.filter_by(activity_process_id=proc_id).all()
                
                # For each activity, delete its hazards
                for activity in activities_to_delete:
                    hazards_to_delete = Hazard.query.filter_by(hazard_activity_id=activity.activity_id).all()
                    for hazard in hazards_to_delete:
                        Risk.query.filter_by(risk_hazard_id=hazard.hazard_id).delete()
                    
                    Hazard.query.filter_by(hazard_activity_id=activity.activity_id).delete()
                
                # Delete activities
                Activity.query.filter_by(activity_process_id=proc_id).delete()
                
                # Delete process
                Process.query.filter_by(process_id=proc_id).delete()
        
        # Commit changes
        db.session.commit()
        
        # Store form ID in session
        session['current_form_id'] = form.form_id
        
        return jsonify({
            "success": True,
            "form_id": form.form_id,
            "message": "Form saved successfully",
            "action": "updated" if data.get('form_id') else "created"
        }), 200
        
    except Exception as e:
        db.session.rollback()
        import traceback
        print(f"Error saving form2: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500  
    
@user.route('/clear_form_id', methods=['POST'])
def clear_form_id():
    """Clear the form_id from session when the page reloads"""
    try:
        if 'current_form_id' in session:
            # Get the current form ID for logging
            form_id = session.get('current_form_id')
            
            # Remove it from session
            del session['current_form_id']
            
            # Force session save
            session.modified = True
            
            print(f"Cleared form_id {form_id} from session")
            
        return jsonify({
            "success": True, 
            "message": "Form ID cleared from session"
        }), 200
    
    except Exception as e:
        print(f"Error clearing form ID: {str(e)}")
        return jsonify({"error": str(e)}), 500
  

@user.route('/complete_form', methods=['POST'])
def complete_form():
    try:
        # Get the form_id from session
        form_id = session.get('current_form_id')
        
        if not form_id:
            return jsonify({"error": "No active form found"}), 400
        
        # Update the form status to complete
        form = Form.query.get(form_id)
        if not form:
            return jsonify({"error": "Form not found"}), 404
        
        # Mark the form as complete (update fields as needed)
        form.approval = 1  # Or whatever indicates completion in your model
        db.session.commit()
        
        # Clear the form_id from session
        if 'current_form_id' in session:
            del session['current_form_id']
        
        return jsonify({
            "success": True,
            "message": "Form completed successfully",
            "form_id": form_id
        }), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@user.route('/get_form/<int:form_id>', methods=['GET'])
def get_form(form_id):
    try:
        form = Form.query.get(form_id)
        
        if not form:
            return jsonify({"error": "Form not found"}), 404
        
        # Fetch processes, activities, hazards from the database
        processes = []
        
        # Get all processes for this form
        form_processes = Process.query.filter_by(process_form_id=form_id).order_by(Process.process_number).all()
        
        for process in form_processes:
            process_data = {
                "id": process.process_id,
                "process_id": process.process_id, # Include both formats for consistency
                "processNumber": process.process_number,
                "header": process.process_title,
                "location": process.process_location,
                "activities": []
            }
            
            # Get activities for THIS PROCESS specifically
            activities = Activity.query.filter_by(
                activity_process_id=process.process_id
            ).order_by(Activity.activity_number).all()
            
            for activity in activities:
                activity_data = {
                    "id": activity.activity_id,
                    "activity_id": activity.activity_id, # Include both formats
                    "description": activity.work_activity,
                    "activityNumber": activity.activity_number,
                    "remarks": activity.activity_remarks if hasattr(activity, 'activity_remarks') else "",
                }
                
                process_data["activities"].append(activity_data)
            
            processes.append(process_data)
        
        return jsonify({
            "form_id": form.form_id,
            "title": form.title,
            "division": form.division,
            "processes": processes
        }), 200
    
    except Exception as e:
        import traceback
  
@user.route('/check_session', methods=['GET'])
def check_session():
    # Check if this is a redundant call (within 5 seconds of last check)
    current_time = datetime.now()
    last_check = session.get('last_session_check')
    
    # Convert stored time string back to datetime if it exists
    if last_check and isinstance(last_check, str):
        try:
            last_check = datetime.fromisoformat(last_check)
            # If checked within last 5 seconds, return cached result without logging
            if (current_time - last_check).total_seconds() < 5:
                if 'user_id' in session:
                    return jsonify({
                        "logged_in": True,
                        "user_id": session.get('user_id'),
                        "user_name": session.get('user_name', ""),
                        "user_email": session.get('user_email', ""),
                        "user_role": session.get('user_role'),
                        "current_form_id": session.get('current_form_id')
                    }), 200
                return jsonify({"logged_in": False}), 200
        except ValueError:
            pass  # If date parsing fails, continue with normal check
    
    # Store this check time
    session['last_session_check'] = current_time.isoformat()
    
    # Actual session check
    if 'user_id' in session:
        user = User.query.get(session['user_id'])
        if user:
            # Cache user data in session for faster repeat checks
            session['user_name'] = user.user_name
            session['user_email'] = user.user_email
            session['user_role'] = user.user_role
            
            # Include current_form_id in the response if it exists
            current_form_id = session.get('current_form_id')
            
            # Only log full session details once per user session
            if not session.get('logged_session_once'):
                print(f"Session authenticated for user: {user.user_name}")
                session['logged_session_once'] = True
            
            return jsonify({
                "logged_in": True,
                "user_id": user.user_id,
                "user_name": user.user_name,
                "user_email": user.user_email,
                "user_role": user.user_role,
                "current_form_id": current_form_id
            }), 200
    
    return jsonify({"logged_in": False}), 200

@user.route('/store_form_id', methods=['POST'])
def store_form_id():
    """Store form_id in session for persistence across tabs/forms"""
    try:
        data = request.get_json()
        form_id = data.get('form_id')
        
        if not form_id:
            return jsonify({"error": "No form_id provided"}), 400
            
        # Only store if different than current value
        if session.get('current_form_id') != form_id:
            # Store in session
            session['current_form_id'] = form_id
            
            # Force session save
            session.modified = True
            
            print(f"Stored new form_id in session: {form_id}")
        
        return jsonify({
            "success": True, 
            "message": "Form ID stored in session",
            "current_form_id": form_id
        }), 200
    
    except Exception as e:
        print(f"Error storing form ID: {str(e)}")
        return jsonify({"error": str(e)}), 500
  
@user.route('/session', methods=['GET'])
def get_session_data():
    """Get current session data including form_id with caching"""
    try:
        # Use response caching with Cache-Control header
        response = jsonify({
            "user_id": session.get('user_id'),
            "current_form_id": session.get('current_form_id')
        })
        
        # Cache for a longer time - 30 seconds
        response.headers['Cache-Control'] = 'max-age=30'
        return response, 200
        
    except Exception as e:
        print(f"Error getting session: {str(e)}")
        return jsonify({"error": str(e)}), 500
    
@user.route('/downloadForm/<int:form_id>', methods=['GET'])
def download_form(form_id):
    print(f"downloading form with id:", form_id)
    return jsonify({'success': 'Downloading form'}), 200
    
@user.route('/deleteForm/<int:form_id>', methods=['DELETE'])
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
# ctrl f tag AI
@user.route('/ai_generate', methods=['POST'])
def ai_generate():
    """Generate hazard data using AI or query known_data"""
    try:
        data = request.get_json()
        user_input = data.get('input')
        
        if not user_input:
            return jsonify({"error": "No input provided"}), 400

        hazard_data = ai_function(str(user_input)) # Call RAG.py function
        return jsonify({
            "success": True,
            "hazard_data": hazard_data
        }), 200

    except Exception as e:
        print(f"Error generating hazard data: {str(e)}")
        return jsonify({"error": str(e)}), 500


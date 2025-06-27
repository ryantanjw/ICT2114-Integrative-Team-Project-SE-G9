from flask import Blueprint, jsonify, request, session
from flask_cors import CORS
from werkzeug.security import generate_password_hash
from models import User, Form, Activity, Process, Hazard, Risk, HazardType
from . import db
import random
import string
from flask_cors import CORS, cross_origin
from datetime import datetime
import json

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

        #username = User.query.filter_by(user_id=session_user_id).user_name

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
            status = "Draft"
            if form.approval == 1:
                status = "Approved"
            elif form.approval == 0:
                status = "Pending Approval"

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
            
            action = 'updated'
        else:
            # Create new activity
            activity = Activity(
                activity_process_id=activity_process_id,
                work_activity=work_activity,
                activity_number=activity_number
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
    """
    Get all form data needed for Form2 component, including processes, activities and hazards
    with their associated risk data and correctly preserve all IDs.
    """
    try:
        # Store form_id in session for easier access across routes
        session['current_form_id'] = form_id
        
        # Fetch the form
        form = Form.query.get(form_id)
        if not form:
            return jsonify({"error": "Form not found"}), 404
            
        # Get all available hazard types for dropdown
        hazard_types = HazardType.query.all()
        hazard_types_list = [ht.hazard_type for ht in hazard_types]
            
        # Fetch all processes for this form
        processes = Process.query.filter_by(process_form_id=form_id).order_by(Process.process_number).all()
        
        result_processes = []
        
        for process in processes:
            # Get activities for this specific process
            activities = Activity.query.filter_by(
                activity_process_id=process.process_id
            ).order_by(Activity.activity_number).all()
            
            process_data = {
                "id": process.process_id,
                "processNumber": process.process_number,
                "header": process.process_title,
                "location": process.process_location,
                "activities": []
            }
            
            for activity in activities:
                # Get hazards for this activity
                hazards = Hazard.query.filter_by(hazard_activity_id=activity.activity_id).all()
                
                activity_data = {
                    "id": activity.activity_id,
                    "description": activity.work_activity,
                    "activityNumber": activity.activity_number,
                    "remarks": activity.remarks if hasattr(activity, 'remarks') else "",
                    "expanded": True,  # Default expanded for UI
                    "hazards": []
                }
                
                for hazard in hazards:
                    # Get risk data for this hazard
                    risk = Risk.query.filter_by(risk_hazard_id=hazard.hazard_id).first()
                    
                    # Get hazard type
                    hazard_type = None
                    if hazard.hazard_type_id:
                        hazard_type_obj = HazardType.query.get(hazard.hazard_type_id)
                        if hazard_type_obj:
                            hazard_type = hazard_type_obj.hazard_type
                    
                    # Format injuries as list
                    injuries = hazard.injury.split(',') if hazard.injury else []
                    
                    # Build hazard data with matching format expected by Form2.jsx
                    hazard_data = {
                        "id": hazard.hazard_id,
                        "description": hazard.hazard,
                        "type": [hazard_type] if hazard_type else [],
                        "hazard_type_id": hazard.hazard_type_id,  # Include this for easier reference
                        "injuries": injuries,
                        "existingControls": risk.existing_risk_control if risk else "",
                        "additionalControls": risk.additional_risk_control if risk else "",
                        "severity": risk.severity if risk else 1,
                        "likelihood": risk.likelihood if risk else 1,
                        "rpn": risk.RPN if risk else 1,
                        "newInjury": "",  # UI state fields
                        "newType": "",
                        "showTypeInput": False,
                        "showInjuryInput": False
                    }
                    
                    activity_data["hazards"].append(hazard_data)
                
                # If no hazards exist, create a default empty one
                if not activity_data["hazards"]:
                    activity_data["hazards"] = [{
                        "id": f"new_{activity.activity_id}_1",  # Temporary ID that will be replaced on save
                        "description": "",
                        "type": [],
                        "injuries": [],
                        "newInjury": "",
                        "newType": "",
                        "showTypeInput": False,
                        "showInjuryInput": False,
                        "existingControls": "",
                        "additionalControls": "",
                        "severity": 1,
                        "likelihood": 1,
                        "rpn": 1,
                    }]
                
                process_data["activities"].append(activity_data)
            
            result_processes.append(process_data)
        
        # Return the complete form data with hazard types list
        return jsonify({
            "form_id": form.form_id,
            "title": form.title,
            "division": form.division,
            "processes": result_processes,
            "hazardTypesList": hazard_types_list  # Include the hazard types list for dropdowns
        }), 200
        
    except Exception as e:
        import traceback
        print(f"Error fetching form data: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500
  
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
  
@user.route('/store_form_id', methods=['POST'])
def store_form_id():
    """Store form_id in session for persistence across tabs/forms"""
    try:
        data = request.get_json()
        form_id = data.get('form_id')
        
        if not form_id:
            return jsonify({"error": "No form_id provided"}), 400
            
        # Store in session
        session['current_form_id'] = form_id
        
        # Force session save
        session.modified = True
        
        print(f"Stored form_id in session: {form_id}")
        print(f"Current session data: {session}")
        
        return jsonify({
            "success": True, 
            "message": "Form ID stored in session",
            "current_form_id": form_id
        }), 200
    
    except Exception as e:
        print(f"Error storing form ID: {str(e)}")
        return jsonify({"error": str(e)}), 500@user.route('/clear_form_id', methods=['POST'])
def clear_form_id():
    if 'current_form_id' in session:
        del session['current_form_id']
    return jsonify({"success": True, "message": "Form ID cleared from session"}), 200

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
                    "remarks": activity.remarks if hasattr(activity, 'remarks') else "",
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
        print(f"Error fetching form: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500
@user.route('/check_session', methods=['GET'])
def check_session():
    if 'user_id' in session:
        user = User.query.get(session['user_id'])
        if user:
            # Include current_form_id in the response if it exists
            current_form_id = session.get('current_form_id')
            
            return jsonify({
                "logged_in": True,
                "user_id": user.user_id,
                "user_name": user.user_name,
                "user_email": user.user_email,
                "user_role": user.user_role,
                "current_form_id": current_form_id
            }), 200
    
    return jsonify({"logged_in": False}), 200

@user.route('/session', methods=['GET'])
def get_session_data():
    """Get current session data including form_id with caching"""
    try:
        # Use response caching with Cache-Control header
        response = jsonify({
            "user_id": session.get('user_id'),
            "current_form_id": session.get('current_form_id')
        })
        
        # Cache for 5 seconds - adjust as needed
        response.headers['Cache-Control'] = 'max-age=5'
        return response, 200
        
    except Exception as e:
        print(f"Error getting session: {str(e)}")
        return jsonify({"error": str(e)}), 500
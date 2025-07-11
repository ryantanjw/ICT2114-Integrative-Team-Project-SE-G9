from math import ceil
from flask import Blueprint, jsonify, request, session, make_response, send_file, current_app   
from sqlalchemy import text
from flask_cors import CORS
from werkzeug.security import generate_password_hash
from werkzeug.utils import secure_filename
from models import RA_team, RA_team_member, User, Form, Activity, Process, Hazard, Risk, HazardType, KnownData
from models import db
import random
import string
from flask_cors import CORS, cross_origin
from datetime import datetime
import json
from .rag import *
import os
from services import DocxTemplateGenerator
from docx2pdf import convert
import tempfile


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

        # Check if this is a request for recent forms (with limit)
        limit = request.args.get('limit', None, type=int)
        sort_by = request.args.get('sort_by', 'last_access_date', type=str)
        sort_order = request.args.get('sort_order', 'desc', type=str)
        
        # Original pagination parameters (for full form lists)
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 21, type=int)  # Default 21 per page
        
        search = request.args.get('search', '', type=str)
        status_filter = request.args.get('status', '', type=str)
        division_filter = request.args.get('division', '', type=str)

        user = User.query.filter_by(user_id=session_user_id).first()
        username = user.user_name if user else "Unknown User"

        print(f"username:", username)

        query = Form.query.filter_by(form_user_id=session_user_id)

        # Apply filters if provided
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                db.or_(
                    Form.title.ilike(search_term),
                    Form.form_reference_number.ilike(search_term),
                    Form.location.ilike(search_term),
                    Form.process.ilike(search_term)
                )
            )

        if division_filter:
            query = query.filter(Form.division == division_filter)

        # Apply sorting
        if sort_by == 'last_access_date':
            if sort_order == 'desc':
                query = query.order_by(Form.last_access_date.desc())
            else:
                query = query.order_by(Form.last_access_date.asc())
        elif sort_by == 'created_at':
            if sort_order == 'desc':
                query = query.order_by(Form.created_at.desc())
            else:
                query = query.order_by(Form.created_at.asc())

        # If limit is specified (for recent forms), apply it directly
        if limit:
            print(f"Applying limit: {limit}")
            all_forms = query.limit(limit).all()
        else:
            all_forms = query.all()

        filtered_forms = []
        for form in all_forms:

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

            if status_filter and status.lower() != status_filter.lower():
                continue
                
            filtered_forms.append((form, status))

        # Only apply pagination if no limit is specified
        if limit:
            # For recent forms request, no pagination needed
            total_forms = len(filtered_forms)
            paginated_forms = filtered_forms
            print(f"Recent forms request: returning {len(paginated_forms)} forms (limit: {limit})")
        else:
            # Apply pagination for full form lists
            total_forms = len(filtered_forms)
            total_pages = ceil(total_forms / per_page)
            
            # Calculate pagination bounds
            start_index = (page - 1) * per_page
            end_index = start_index + per_page
            paginated_forms = filtered_forms[start_index:end_index]
            print(f"Paginated request: Total forms after filtering: {total_forms}, Current page forms: {len(paginated_forms)}")

        forms_list = []
        for form, status in paginated_forms:

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
                'owner': username  # Add username to the response
            })

        # Prepare response data
        if limit:
            # Simple response for recent forms
            response_data = {
                'forms': forms_list,
                'total_forms': total_forms,
                'limit': limit
            }
        else:
            # Full response with pagination for form lists
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

        print(f"Returning {len(forms_list)} forms")
        
        # Create response with no-cache headers
        response = make_response(jsonify(response_data))
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'

        return response
        
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
        
        # Delete the process
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
    

@user.route('/activity/<int:activity_id>', methods=['DELETE'])
def delete_activity(activity_id):
    try:
        # Find the activity
        activity = Activity.query.get(activity_id)
        print(f"backend activity to be deleted found:", activity)
        if not activity:
            return jsonify({'error': 'Activity not found'}), 404
        
        # Delete hazards associated with this activity
        hazards = Hazard.query.filter_by(hazard_activity_id=activity_id).all()
        
        for hazard in hazards:
            # Delete risks associated with this hazard
            Risk.query.filter_by(risk_hazard_id=hazard.hazard_id).delete()
            
        # Delete the hazards
        Hazard.query.filter_by(hazard_activity_id=activity_id).delete()
        
        # Delete the activity
        db.session.delete(activity)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Activity {activity_id} and all associated data deleted successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting activity {activity_id}: {str(e)}")
        return jsonify({'error': 'Failed to delete activity'}), 500


@user.route('/shareForm/<int:formId>', methods=['POST'])
def share_form(formId):
    try:
        userId = session.get('user_id')
        print(f"User {userId} sharing form {formId}")

        # Get request data
        data = request.get_json()
        target_user_id = data.get('target_user_id')
        
        if not target_user_id:
            return jsonify({'error': 'Target user ID is required'}), 400

        # Get the original form
        original_form = Form.query.get(formId)
        if not original_form:
            return jsonify({'error': 'Original form not found'}), 404
        
        # Generate unique title for shared form
        base_title = f"{original_form.title} (Shared)"
        shared_title = base_title
        counter = 1
        
        # Check if a form with this title already exists for the target user
        while Form.query.filter_by(form_user_id=target_user_id, title=shared_title).first():
            shared_title = f"{base_title} ({counter})"
            counter += 1
        
        # Create new form (shared copy) - using the same structure as duplicate
        new_form = Form(
            title=shared_title,
            division=original_form.division,
            location=original_form.location,
            process=original_form.process,
            form_reference_number=None,  
            form_user_id=target_user_id,  # Assign to target user instead of current user
            form_RA_team_id=original_form.form_RA_team_id, 
            approval=0,  
            approved_by=None,  
            last_access_date=datetime.now(),
            last_review_date=None,  
            next_review_date=None
        )
        
        db.session.add(new_form)
        db.session.flush()  # Get the new form ID
        
        print(f"Created new shared form with ID: {new_form.form_id}")

        # Get all processes from the original form
        original_processes = Process.query.filter_by(process_form_id=formId).all()
        
        # Dictionary to map old process IDs to new process IDs
        process_id_mapping = {}
        
        for original_process in original_processes:
            # Create new process
            new_process = Process(
                process_form_id=new_form.form_id,
                process_number=original_process.process_number,
                process_title=original_process.process_title,
                process_location=original_process.process_location
            )
            
            db.session.add(new_process)
            db.session.flush()  # Get the new process ID
            
            # Store mapping for reference
            process_id_mapping[original_process.process_id] = new_process.process_id
            
            print(f"Created new process: {original_process.process_id} -> {new_process.process_id}")
            
             # Get all activities for this process
            original_activities = Activity.query.filter_by(
                activity_process_id=original_process.process_id
            ).all()
            
            # Dictionary to map old activity IDs to new activity IDs
            activity_id_mapping = {}
            
            for original_activity in original_activities:
                # Create new activity
                new_activity = Activity(
                    activity_process_id=new_process.process_id,
                    work_activity=original_activity.work_activity,
                    activity_number=original_activity.activity_number,
                    activity_remarks=getattr(original_activity, 'activity_remarks', None)
                )
                
                db.session.add(new_activity)
                db.session.flush()  # Get the new activity ID
                
                # Store mapping for reference
                activity_id_mapping[original_activity.activity_id] = new_activity.activity_id
                
                print(f"Created new activity: {original_activity.activity_id} -> {new_activity.activity_id}")
                
                # Get all hazards for this activity
                original_hazards = Hazard.query.filter_by(
                    hazard_activity_id=original_activity.activity_id
                ).all()
                
                for original_hazard in original_hazards:
                    # Create new hazard
                    new_hazard = Hazard(
                        hazard_activity_id=new_activity.activity_id,
                        hazard=original_hazard.hazard,
                        hazard_type_id=original_hazard.hazard_type_id,
                        injury=original_hazard.injury
                    )
                    
                    db.session.add(new_hazard)
                    db.session.flush()  # Get the new hazard ID
                    
                    print(f"Created new hazard: {original_hazard.hazard_id} -> {new_hazard.hazard_id}")
                    
                    # Get the risk associated with this hazard
                    original_risk = Risk.query.filter_by(
                        risk_hazard_id=original_hazard.hazard_id
                    ).first()
                    
                    if original_risk:
                        # Create new risk
                        new_risk = Risk(
                            risk_hazard_id=new_hazard.hazard_id,
                            existing_risk_control=original_risk.existing_risk_control,
                            additional_risk_control=original_risk.additional_risk_control,
                            severity=original_risk.severity,
                            likelihood=original_risk.likelihood,
                            RPN=original_risk.RPN,
                        )
                        
                        db.session.add(new_risk)
                        print(f"Created new risk for hazard: {new_hazard.hazard_id}")
        
        # Commit all changes
        db.session.commit()
        
        print(f"Successfully shared form {formId} -> {new_form.form_id} with user {target_user_id}")

        return jsonify({
            'success': True,
            'message': f'Form shared successfully',
            'original_form_id': formId,
            'shared_form_id': new_form.form_id,
            'shared_form_title': new_form.title
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error sharing form {formId}: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return jsonify({'error': f'Failed to share form: {str(e)}'}), 500
    
@user.route('/duplicateForm/<int:formId>', methods=['POST'])
def duplicate_form(formId):
    try:
        userId = session.get('user_id')
        print(userId)

        original_form = Form.query.get(formId)
        if not original_form:
            return jsonify({'error': 'Original form not found'}), 404
        
        # Create new form (duplicate)
        new_form = Form(
            title=f"{original_form.title} (Copy)",  
            division=original_form.division,
            location=original_form.location,
            process=original_form.process,
            form_reference_number=None,  
            form_user_id=userId,  
            form_RA_team_id=original_form.form_RA_team_id, 
            approval=0,  
            approved_by=None,  
            last_access_date=datetime.now(),
            last_review_date=None,  # Reset review dates
            next_review_date=None
        )
        
        db.session.add(new_form)
        db.session.flush()  # Get the new form ID
        
        print(f"Created new form with ID: {new_form.form_id}")

        # Get all processes from the original form
        original_processes = Process.query.filter_by(process_form_id=formId).all()
        
        # Dictionary to map old process IDs to new process IDs
        process_id_mapping = {}
        
        for original_process in original_processes:
            # Create new process
            new_process = Process(
                process_form_id=new_form.form_id,
                process_number=original_process.process_number,
                process_title=original_process.process_title,
                process_location=original_process.process_location
            )
            
            db.session.add(new_process)
            db.session.flush()  # Get the new process ID
            
            # Store mapping for reference
            process_id_mapping[original_process.process_id] = new_process.process_id
            
            print(f"Created new process: {original_process.process_id} -> {new_process.process_id}")
            
            # Get all activities for this process
            original_activities = Activity.query.filter_by(
                activity_process_id=original_process.process_id
            ).all()
            
            # Dictionary to map old activity IDs to new activity IDs
            activity_id_mapping = {}
            
            for original_activity in original_activities:
                # Create new activity
                new_activity = Activity(
                    activity_process_id=new_process.process_id,
                    work_activity=original_activity.work_activity,
                    activity_number=original_activity.activity_number,
                    activity_remarks=getattr(original_activity, 'activity_remarks', None)
                )
                
                db.session.add(new_activity)
                db.session.flush()  # Get the new activity ID
                
                # Store mapping for reference
                activity_id_mapping[original_activity.activity_id] = new_activity.activity_id
                
                print(f"Created new activity: {original_activity.activity_id} -> {new_activity.activity_id}")
                
                # Get all hazards for this activity
                original_hazards = Hazard.query.filter_by(
                    hazard_activity_id=original_activity.activity_id
                ).all()
                
                for original_hazard in original_hazards:
                    # Create new hazard
                    new_hazard = Hazard(
                        hazard_activity_id=new_activity.activity_id,
                        hazard=original_hazard.hazard,
                        hazard_type_id=original_hazard.hazard_type_id,
                        injury=original_hazard.injury
                    )
                    
                    db.session.add(new_hazard)
                    db.session.flush()  # Get the new hazard ID
                    
                    print(f"Created new hazard: {original_hazard.hazard_id} -> {new_hazard.hazard_id}")
                    
                    # Get the risk associated with this hazard
                    original_risk = Risk.query.filter_by(
                        risk_hazard_id=original_hazard.hazard_id
                    ).first()
                    
                    if original_risk:
                        # Create new risk
                        new_risk = Risk(
                            risk_hazard_id=new_hazard.hazard_id,
                            existing_risk_control=original_risk.existing_risk_control,
                            additional_risk_control=original_risk.additional_risk_control,
                            severity=original_risk.severity,
                            likelihood=original_risk.likelihood,
                            RPN=original_risk.RPN,
                        )
                        
                        db.session.add(new_risk)
                        print(f"Created new risk for hazard: {new_hazard.hazard_id}")
        
        # Commit all changes
        db.session.commit()
        
        print(f"Successfully duplicated form {formId} -> {new_form.form_id}")

        return jsonify({
            'success': True,
            'message': f'Form duplicated successfully',
            'original_form_id': formId,
            'new_form_id': new_form.form_id,
            'new_form_title': new_form.title
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error duplicating form {formId}: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return jsonify({'error': f'Failed to duplicate form: {str(e)}'}), 500

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
            not data.get('division') or
            not data.get('form_id')):
            return jsonify({"success": False, "error": "Missing required fields. Form ID is required for updates."}), 400
    
    try:
        form_id = data.get('form_id')
        title = data.get('title')
        division = data.get('division')
        current_time = datetime.now()

        # Form1 should only update existing forms
        form = Form.query.get(form_id)
        if not form:
            return jsonify({"error": "Form not found. Use Form3 to create new forms."}), 404
        
        print(f"Updating existing form with ID: {form_id}")
        form.title = title
        form.division = division
        form.last_access_date = current_time  # Set last access date to current time

        db.session.commit()

        return jsonify({
            "success": True,
            "form_id": form.form_id,    
            "action": "updated",
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
                "remarks": activity.activity_remarks,
                "hazards": []
            }
            
            # Get hazards for this activity
            hazards = Hazard.query.filter_by(hazard_activity_id=activity.activity_id).all()
            print(f"hazards found")

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
                    "rpn": risk.RPN if risk else 1,
                    "hazard_implementation_person": hazard.hazard_implementation_person if risk else ""
                }
                
                act_data["hazards"].append(hazard_data)
            
            # If no hazards, add a default empty one
            if not act_data["hazards"]:
                print(f"no hazards")
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
                    
                    # Always save implementation person, whether empty or not
                    hazard.hazard_implementation_person = haz_data.get('implementationPerson', '')
                    
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
    
@user.route('/get_form3_data/<int:form_id>', methods=['GET'])
def get_form3_data(form_id):
    """Get specific Form3 data including RA team and approval info"""
    try:
        form = Form.query.get(form_id)
        
        if not form:
            return jsonify({"error": "Form not found"}), 404
        
        # Get current user from session
        current_user_id = session.get('user_id')
        current_user = None
        if current_user_id:
            current_user = User.query.get(current_user_id)
        
        # Get all process locations for this form
        process_locations = []
        processes = Process.query.filter_by(process_form_id=form_id).all()
        for process in processes:
            if process.process_location and process.process_location.strip():
                process_locations.append(process.process_location.strip())
        
        # Join unique locations with commas
        combined_location = ", ".join(list(dict.fromkeys(process_locations)))
        
        # Prepare basic form data
        form_data = {
            "form_id": form.form_id,
            "title": form.title,
            "division": form.division,
            "location": combined_location,  # Use combined process locations
            "form_reference_number": form.form_reference_number,
            "approved_by": None,
            "last_review_date": None,
            "team_data": None
        }
        
        # Format dates if they exist
        if form.last_review_date:
            form_data["last_review_date"] = form.last_review_date.isoformat()
        
        if form.next_review_date:
            form_data["next_review_date"] = form.next_review_date.isoformat()
            
        # Get approver information
        if form.approved_by:
            approver = User.query.get(form.approved_by)
            if approver:
                form_data["approved_by"] = {
                    "user_id": approver.user_id,
                    "user_name": approver.user_name,
                    "user_designation": approver.user_designation
                }
        
        # Get RA Team info if available
        if form.form_RA_team_id:
            ra_team = RA_team.query.get(form.form_RA_team_id)
            if ra_team:
                team_data = {
                    "team_id": ra_team.RA_team_id,
                    "leader": None,
                    "members": []
                }
                            
                # Always set leader to current user
                if current_user:
                    team_data["leader"] = {
                        "user_id": current_user.user_id,
                        "user_name": current_user.user_name,
                        "user_email": current_user.user_email,
                        "user_designation": current_user.user_designation
                    }
                # Fallback to stored leader if needed
                elif ra_team.RA_leader:  # This is the correct column name in your model
                    leader = User.query.get(ra_team.RA_leader)
                    if leader:
                        team_data["leader"] = {
                            "user_id": leader.user_id,
                            "user_name": leader.user_name,
                            "user_email": leader.user_email,
                            "user_designation": leader.user_designation
                        }
                                        
                # Get team members                
                team_members_query = text(f"SELECT * FROM risk_database.RA_team_member WHERE RA_team_id = {ra_team.RA_team_id}")
                team_members_result = db.session.execute(team_members_query)
                print(f"Executing SQL: SELECT * FROM risk_database.RA_team_member WHERE RA_team_id = {ra_team.RA_team_id}")
                
                # Clear the members array before populating
                team_data["members"] = []
                
                # Process each row from the SQL query
                for member_row in team_members_result:
                    print(f"Raw team member row: {member_row}")
                    
                    # Get the user_id from the RA_team_member column - safer access
                    try:
                        # Try dictionary access first
                        if hasattr(member_row, 'keys') and 'RA_team_member' in member_row.keys():
                            member_id = member_row['RA_team_member']
                        # Try indexed access - only use index 1 (second column) as fallback
                        elif len(member_row) > 1:
                            member_id = member_row[1]  # Changed from index 2 to index 1
                        else:
                            print(f"Could not extract member ID from row: {member_row}")
                            continue
                            
                        print(f"Extracted member ID: {member_id}")
                        
                        if member_id:
                            member = User.query.get(member_id)
                            if member:
                                print(f"Found user: {member.user_name}")
                                team_data["members"].append({
                                    "user_id": member.user_id,
                                    "user_name": member.user_name,
                                    "user_email": member.user_email,
                                    "user_designation": member.user_designation
                                })
                            else:
                                print(f"No user found with ID: {member_id}")
                    except Exception as e:
                        print(f"Error processing team member row: {e}")
                        continue
                
                print(f"Final members list: {team_data['members']}")
                form_data["team_data"] = team_data
                print(f"RA Team data: {form_data['team_data']}")
        else:
            # If no RA team exists yet, still provide current user as leader
            if current_user:
                form_data["team_data"] = {
                    "team_id": None,
                    "leader": {
                        "RA_team_member": current_user.user_id,
                       
                    },
                    "members": []
                }
        
        return jsonify(form_data), 200
        
    except Exception as e:
        import traceback
        print(f"Error fetching form3 data: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500
    
@user.route('/form3', methods=['POST'])
def form3_save():
    print("\nSAVE FORM 3 CALLED")
    
    try:
        data = request.get_json()
        print(f"Received form3 data: {data}")
        
        # Get user ID
        userid = session.get('user_id')
        if not userid:
            return jsonify({"error": "User ID is required"}), 400
            
        # Get current user
        current_user = User.query.get(userid)
        if not current_user:
            return jsonify({"error": "Current user not found"}), 400
        
        # Validate required fields for form creation
        if not data or not data.get('title') or not data.get('division'):
            return jsonify({"success": False, "error": "Title and division are required"}), 400
        
        form_id = data.get('form_id')
        title = data.get('title')
        division = data.get('division')
        current_time = datetime.now()
        
        if form_id:
            # Update existing form
            form = Form.query.get(form_id)
            if not form:
                return jsonify({"error": "Form not found"}), 404
            
            print(f"Updating existing form with ID: {form_id}")
            form.title = title
            form.division = division
            action = 'updated'
        else:
            # Create new form
            print("Creating new form in Form3")
            form = Form(
                title=title,
                division=division,
                form_user_id=userid
            )
            db.session.add(form)
            db.session.flush()  # Get the form ID immediately
            action = 'created'
        
        form.last_access_date = current_time
        
        # Update form fields from Form3
        if 'form_reference_number' in data:
            form.form_reference_number = data.get('form_reference_number')
            
        if 'location' in data:
            form.location = data.get('location')
            
        if 'last_review_date' in data and data.get('last_review_date'):
            try:
                form.last_review_date = datetime.fromisoformat(data.get('last_review_date'))
            except ValueError:
                print(f"Invalid last_review_date format: {data.get('last_review_date')}")
                
        if 'next_review_date' in data and data.get('next_review_date'):
            try:
                form.next_review_date = datetime.fromisoformat(data.get('next_review_date'))
            except ValueError:
                print(f"Invalid next_review_date format: {data.get('next_review_date')}")
        
        # Handle RA Team
        ra_team_members = data.get('raTeam', [])
        
        # First, handle the RA Team creation and leader assignment
        if not form.form_RA_team_id:
            # Create new RA Team with the current user as leader
            ra_team = RA_team(RA_leader=current_user.user_id)
            db.session.add(ra_team)
            db.session.flush()  # Flush to get the team ID
            form.form_RA_team_id = ra_team.RA_team_id
        else:
            # Use existing RA Team
            ra_team = RA_team.query.get(form.form_RA_team_id)
            if not ra_team:
                # Create new if missing
                ra_team = RA_team(RA_leader=current_user.user_id)
                db.session.add(ra_team)
                db.session.flush()
                form.form_RA_team_id = ra_team.RA_team_id
            else:
                # Update the leader to the current user
                ra_team.RA_leader = current_user.user_id
        
        # Now that we have a valid RA team with a leader, handle team members
        if ra_team_members:
            # Remove existing team members
            RA_team_member.query.filter_by(RA_team_id=ra_team.RA_team_id).delete()
            
            # Add new team members
            for member_name in ra_team_members:
                if member_name.strip():
                    member = User.query.filter_by(user_name=member_name.strip()).first()
                    if member:
                        # Avoid adding the leader as a team member (they're already the leader)
                        if member.user_id != current_user.user_id:
                            team_member = RA_team_member(
                                RA_team_id=ra_team.RA_team_id,
                                RA_team_member=member.user_id
                            )
                            db.session.add(team_member)
        
        # Handle approval information
        if 'approvedBy' in data and data.get('approvedBy'):
            approver_name = data.get('approvedBy')
            approver = User.query.filter_by(user_name=approver_name).first()
            if approver:
                form.approved_by = approver.user_id
                form.approval = 1  # Mark as approved
                
                # Handle approval date
                if 'last_review_date' in data and data.get('last_review_date'):
                    try:
                        form.last_review_date = datetime.fromisoformat(data.get('last_review_date'))
                    except ValueError:
                        # Default to current date if invalid
                        form.last_review_date = datetime.now()
                else:
                    form.last_review_date = datetime.now()
            else:
                # If approver name is provided but user not found, store as pending
                form.approval = 0  # Pending approval
        
        # Commit changes
        db.session.commit()
        
        # Store form_id in session for persistence across tabs (like form1 originally did)
        session['current_form_id'] = form.form_id
        
        return jsonify({
            "success": True,
            "form_id": form.form_id,
            "message": f"Form {action} successfully",
            "action": action,
            "last_access_date": form.last_access_date.isoformat()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        import traceback
        print(f"Error saving form3: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500
    
@user.route('/users', methods=['GET'])
def get_users():
    """Get list of users for dropdown selection"""
    try:
        # Get current user ID from session
        current_user_id = session.get('user_id')
        
        # Get form ID from query params if available (for excluding team members)
        form_id = request.args.get('form_id')
        
        # Get all users
        users = User.query.all()
        
        # Initialize list to hold excluded user IDs
        excluded_user_ids = []
        
        # Always exclude current user
        if current_user_id:
            excluded_user_ids.append(current_user_id)
        
        # If form_id is provided, also exclude existing team members
        if form_id:
            form = Form.query.get(form_id)
            if form and form.form_RA_team_id:
                # Get RA team members using raw SQL query for consistency
                team_members_query = text(f"SELECT * FROM risk_database.RA_team_member WHERE RA_team_id = {form.form_RA_team_id}")
                team_members_result = db.session.execute(team_members_query)
                
                # Process each row from the SQL query
                for member_row in team_members_result:
                    print(f"Excluding team member: {member_row}")
                    # Try to get member ID from the second column (index 1)
                    if len(member_row) > 1:
                        member_id = member_row[1]
                        excluded_user_ids.append(member_id)
        
        # Print the excluded users for debugging
        print(f"Excluded user IDs: {excluded_user_ids}")
        
        # Filter users to exclude current user and team members
        filtered_users = [user for user in users if user.user_id not in excluded_user_ids]
        
        # Format the response
        users_list = [{
            "user_id": user.user_id,
            "user_name": user.user_name,
            "user_email": user.user_email,
            "user_designation": user.user_designation,
            "user_role": user.user_role,
            "user_cluster": user.user_cluster
        } for user in filtered_users]
        
        print(f"Returning {len(users_list)} users for dropdown")
        
        return jsonify(users_list), 200
        
    except Exception as e:
        print(f"Error fetching users: {str(e)}")
        return jsonify({"error": str(e)}), 500
        
@user.route('/user/<int:user_id>', methods=['GET'])
def get_user(user_id):
    """Get user details by ID"""
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404
            
        return jsonify({
            "user_id": user.user_id,
            "user_name": user.user_name,
            "user_email": user.user_email,
            "user_designation": user.user_designation,
            "user_role": user.user_role,
            "user_cluster": user.user_cluster
        }), 200
        
    except Exception as e:
        print(f"Error fetching user: {str(e)}")
        return jsonify({"error": str(e)}), 500

@user.route('/current', methods=['GET'])
def get_current_user():
    """Get current logged-in user details"""
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({"error": "Not logged in"}), 401
            
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404
            
        return jsonify({
            "user_id": user.user_id,
            "user_name": user.user_name,
            "user_email": user.user_email,
            "user_designation": user.user_designation,
            "user_role": user.user_role,
            "user_cluster": user.user_cluster
        }), 200
        
    except Exception as e:
        print(f"Error fetching current user: {str(e)}")
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
        
        # Store form_id in session for future use
        session['current_form_id'] = form_id
        
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
        print(f"Error getting form: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@user.route('/get_form', methods=['GET'])
def get_current_form():
    """Get form data from session's current_form_id"""
    try:
        # Get form_id from session
        form_id = session.get('current_form_id')
        
        if not form_id:
            return jsonify({"error": "No current form in session"}), 404
        
        # Use the existing get_form logic
        return get_form(form_id)
    
    except Exception as e:
        import traceback
        print(f"Error getting current form: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500
  
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

# Reset user password (user only)
@user.route('/reset_password', methods=['POST'])
def reset_password():
    print("\n=== RESET PASSWORD CALLED ===")
    
    # Check if user is logged in and is an admin
    if 'user_id' not in session:
        print("No active session found")
        return jsonify({"success": False, "error": "Not authenticated"}), 401
    
    if session.get('user_role') != 1:  # 1 = user
        print(f"Non user attempted to reset a password. Role: {session.get('user_role')}")
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
        
        # Hash the new password
        # hashed_password = generate_password_hash(data['new_password'])
        # user.user_password = hashed_password
        
        user.password = data['new_password']  # Make sure to hash this in production!
        
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

import traceback 

@user.route('/generate-pdf/<assessment_id>', methods=['POST'])
def generate_pdf(assessment_id):
    form_data = request.get_json()
    
    print(f"=== Starting PDF generation for assessment_id: {assessment_id} ===")
    print(f"Received form_data: {form_data}")
    
    try:
        # Check if template exists
        template_path = "Risk_Assessment_Form_Template.docx"
        if not os.path.exists(template_path):
            print(f"ERROR: Template file not found: {template_path}")
            return jsonify({"error": f"Template file not found: {template_path}"}), 500
        
        print(f"Template file exists: {template_path}")
        
        # Generate DOCX first
        generator = DocxTemplateGenerator(template_path)
        print("Generator created successfully")
        
        output_path = generator.generate_with_python_docx(assessment_id, form_data)
        print(f"Generator returned output_path: {output_path}")
        
        # Check if output_path is None
        if output_path is None:
            print("ERROR: generate_with_python_docx returned None")
            return jsonify({"error": "Document generation failed - output_path is None"}), 500
        
        # Check if file actually exists
        if not os.path.exists(output_path):
            print(f"ERROR: Generated file does not exist: {output_path}")
            return jsonify({"error": f"Generated file does not exist: {output_path}"}), 500
        
        print(f"DOCX file generated successfully: {output_path}")
        
        # Determine which platform we're on
        import platform
        system = platform.system()
        
        # Convert to PDF
        pdf_path = output_path.replace('.docx', '.pdf')
        print(f"Converting to PDF: {pdf_path}")
        
        if system == "Windows":
            # Use Windows-specific method with COM objects
            try:
                import pythoncom
                from docx2pdf import convert

                pythoncom.CoInitialize()
                convert(output_path, pdf_path)
                pythoncom.CoUninitialize()

            except ImportError:
                print("WARNING: pythoncom not available, falling back to alternative method")
        else:
            # For macOS and other platforms
            convert_using_alternative(output_path, pdf_path)
        
        print("PDF conversion completed")
        
        # Verify PDF exists
        if not os.path.exists(pdf_path):
            print(f"ERROR: PDF file was not created: {pdf_path}")
            return jsonify({"error": "PDF conversion failed"}), 500
        
        print(f"PDF file created successfully: {pdf_path}")
        
        # Clean up DOCX file (optional)
        try:
            os.remove(output_path)
            print("DOCX file cleaned up")
        except:
            print("Could not clean up DOCX file")
        
        return send_file(pdf_path, as_attachment=True)
        
    except Exception as e:
        print(f"ERROR in PDF generation: {e}")
        print("Full traceback:")
        traceback.print_exc()
        return jsonify({"error": f"PDF generation failed: {str(e)}"}), 500
    
def convert_using_alternative(docx_path, pdf_path):
    """Cross-platform DOCX to PDF conversion"""
    import platform
    system = platform.system()
    
    try:
        if system == "Darwin":  # macOS
            # Try using LibreOffice first (if installed)
            try:
                import subprocess
                # Check if LibreOffice exists
                libreoffice_paths = [
                    "/Applications/LibreOffice.app/Contents/MacOS/soffice",
                    "/Applications/OpenOffice.app/Contents/MacOS/soffice"
                ]
                
                soffice_path = None
                for path in libreoffice_paths:
                    if os.path.exists(path):
                        soffice_path = path
                        break
                
                if soffice_path:
                    cmd = [
                        soffice_path,
                        '--headless',
                        '--convert-to', 'pdf',
                        '--outdir', os.path.dirname(pdf_path),
                        docx_path
                    ]
                    subprocess.run(cmd, check=True)
                    print("LibreOffice conversion successful")
                    return
            except Exception as e:
                print(f"LibreOffice conversion failed: {e}, trying next method")
                
            # Try using pandoc
            try:
                import subprocess
                cmd = ['pandoc', docx_path, '-o', pdf_path]
                subprocess.run(cmd, check=True)
                print("Pandoc conversion successful")
                return
            except Exception as e:
                print(f"Pandoc conversion failed: {e}, trying next method")
                
            # Fall back to python-based conversion
            try:
                from docx2pdf import convert
                convert(docx_path, pdf_path)
                print("docx2pdf conversion successful")
                return
            except Exception as e:
                print(f"docx2pdf conversion failed: {e}")
                raise
        
        elif system == "Linux":
            # Try using LibreOffice
            try:
                import subprocess
                cmd = [
                    'libreoffice', 
                    '--headless', 
                    '--convert-to', 'pdf', 
                    '--outdir', os.path.dirname(pdf_path),
                    docx_path
                ]
                subprocess.run(cmd, check=True)
                return
            except Exception as e:
                print(f"LibreOffice conversion failed: {e}, trying next method")
                
            # Try using pandoc
            try:
                import subprocess
                cmd = ['pandoc', docx_path, '-o', pdf_path]
                subprocess.run(cmd, check=True)
                return
            except Exception as e:
                print(f"All conversion methods failed: {e}")
                raise
        else:
            # For other platforms - try generic approaches
            from docx2pdf import convert
            convert(docx_path, pdf_path)
    
    except Exception as e:
        print(f"Error in alternative conversion: {e}")
        import traceback
        traceback.print_exc()
        raise Exception(f"Failed to convert DOCX to PDF: {e}")
    
@user.route('/test-generate-document/<assessment_id>', methods=['POST'])
def test_generate_document_debug(assessment_id):
    form_data = request.get_json()
    
    print(f"=== Starting document generation for assessment_id: {assessment_id} ===")
    print(f"Received form_data: {form_data}")
    
    try:
        # Check if template exists
        template_path = "Risk_Assessment_Form_Template.docx"
        if not os.path.exists(template_path):
            print(f"ERROR: Template file not found: {template_path}")
            return jsonify({"error": f"Template file not found: {template_path}"}), 500
        
        print(f"Template file exists: {template_path}")
        
        # Generate DOCX
        generator = DocxTemplateGenerator(template_path)
        print("Generator created successfully")
        
        output_path = generator.generate_with_python_docx(assessment_id, form_data)
        print(f"Generator returned output_path: {output_path}")
        
        if output_path:
            return send_file(output_path, as_attachment=True)
        else:
            return jsonify({"error": "Document generation failed"}), 500
        
    except Exception as e:
        print(f"ERROR in document generation: {e}")
        print("Full traceback:")
        traceback.print_exc()
        return jsonify({"error": f"Document generation failed: {str(e)}"}), 500

    

    
@user.route('/getFormDataForDocument/<int:formId>', methods=['GET'])
def get_form_data_for_document(formId):
    """
    Simplified version that returns data in a format optimized for document generation
    """
    try:
        userId = session.get('user_id')
        
        # Get the form
        form = Form.query.get(formId)
        if not form:
            return jsonify({'error': 'Form not found'}), 404
        
        # Get all data with a single query approach (more efficient)
        processes = Process.query.filter_by(process_form_id=formId).all()
        
        # Build simplified structure for document generation
        document_data = {
            'form': {
                'title': form.title,
                'division': form.division,
                'location': form.location,
                'process': form.process,
                'form_reference_number': form.form_reference_number,
                'approval': form.approval,
                'approved_by': form.approved_by,
                'last_review_date': form.last_review_date.isoformat() if form.last_review_date else None,
                'next_review_date': form.next_review_date.isoformat() if form.next_review_date else None
            },
            'activities_data': []  # Flattened for easier document processing
        }
        
        for process in processes:
            activities = Activity.query.filter_by(activity_process_id=process.process_id).all()
            
            for activity in activities:
                activity_entry = {
                    'location': process.process_location,
                    'process': process.process_title,
                    'work_activity': activity.work_activity,
                    'remarks': getattr(activity, 'activity_remarks', ''),
                    'hazards': []
                }
                
                # Get hazards for this activity
                hazards = Hazard.query.filter_by(hazard_activity_id=activity.activity_id).all()
                
                for hazard in hazards:
                    risk = Risk.query.filter_by(risk_hazard_id=hazard.hazard_id).first()
                    
                    hazard_entry = {
                        'hazard': hazard.hazard,
                        'injury': hazard.injury,
                        'existing_controls': risk.existing_risk_control if risk else '',
                        'additional_controls': risk.additional_risk_control if risk else '',
                        'severity': risk.severity if risk else None,
                        'likelihood': risk.likelihood if risk else None,
                        'rpn': risk.RPN if risk else None
                    }
                    
                    activity_entry['hazards'].append(hazard_entry)
                
                document_data['activities_data'].append(activity_entry)
        
        return jsonify({
            'success': True,
            'data': document_data
        }), 200

    except Exception as e:
        print(f"Error retrieving form data for document generation: {str(e)}")
        return jsonify({'error': f'Failed to retrieve form data: {str(e)}'}), 500
    
@user.route('/update-form-approval/<form_id>', methods=['PUT'])
def update_form_approval(form_id):
    try:
        data = request.get_json()
        approval_status = data.get('approval')
        
        # Get the form from the database
        form = db.session.query(Form).filter(Form.form_id == form_id).first()
        
        if not form:
            return jsonify({"error": "Form not found"}), 404
        
        # Update the approval status
        form.approval = approval_status
        db.session.commit()
        
        return jsonify({"message": "Form approval status updated successfully", "approval": approval_status}), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error updating form approval: {e}")
        return jsonify({"error": f"Failed to update form approval: {str(e)}"}), 500
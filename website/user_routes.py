from flask import Blueprint, jsonify, request, session
from sqlalchemy import text
from flask_cors import CORS
from werkzeug.security import generate_password_hash
from models import RA_team, RA_team_member, User, Form, Activity, Process, Hazard, Risk, HazardType, KnownData
from . import db
import random
import string
from flask_cors import CORS, cross_origin
from datetime import datetime
import json
from .rag import *
import os
import uuid
from PyPDF2 import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from io import BytesIO
from flask import send_file

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
            
        # Validate required fields
        if (not data or 
                not data.get('form_id')):
                return jsonify({"success": False, "error": "Missing required fields"}), 400
        
        form_id = data.get('form_id')
        form = Form.query.get(form_id)
        
        if not form:
            return jsonify({"error": "Form not found"}), 404
        
        # Update form fields
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
        
        return jsonify({
            "success": True,
            "form_id": form.form_id,
            "message": "Form 3 saved successfully"
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

@user.route('/generate_pdf', methods=['POST'])
def generate_pdf():
    try:
        # Get form ID from request body
        data = request.get_json()
        form_id = data.get('form_id')
        
        if not form_id:
            return jsonify({'error': 'Form ID is required'}), 400
        
        # Get form data
        form = Form.query.get(form_id)
        if not form:
            return jsonify({'error': 'Form not found'}), 404
            
        # Get user data
        user = User.query.get(form.form_user_id)
        user_name = user.user_name if user else "Unknown"
            
        # Get processes, activities, hazards, and risks
        processes = Process.query.filter_by(process_form_id=form_id).all()
        
        # CHANGED: Create directory for generated PDFs in the react-front-end folder
        upload_folder = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 
                                    'react-front-end', 'public', 'forms', 'generated_forms')
        if not os.path.exists(upload_folder):
            os.makedirs(upload_folder)
            
        # Generate a unique filename
        output_filename = f"risk_assessment_{form_id}_{uuid.uuid4().hex[:8]}.pdf"
        output_path = os.path.join(upload_folder, output_filename)
        
        # CHANGED: Path to template PDF in the react-front-end folder
        template_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                                    'react-front-end', 'public', 'forms', 'Risk_Assessment_Form_Template.pdf')
        
        # Create PDF with form data
        packet = BytesIO()
        can = canvas.Canvas(packet, pagesize=letter)
        
        # Set font
        can.setFont("Helvetica", 10)
        
        # Add form data to PDF - these coordinates need to be adjusted for your template
        # Header information
        can.drawString(100, 700, f"Title: {form.title}")
        can.drawString(100, 680, f"Division: {form.division}")
        can.drawString(100, 660, f"Reference: {form.form_reference_number or 'N/A'}")
        can.drawString(100, 640, f"Location: {form.location or 'N/A'}")
        can.drawString(100, 620, f"Created by: {user_name}")
        
        # Add review dates
        if form.last_review_date:
            can.drawString(100, 600, f"Last Review: {form.last_review_date.strftime('%d/%m/%Y')}")
        if form.next_review_date:
            can.drawString(100, 580, f"Next Review: {form.next_review_date.strftime('%d/%m/%Y')}")
            
        # Add process and activity information
        y_position = 540
        for i, process in enumerate(processes):
            can.drawString(80, y_position, f"Process {i+1}: {process.process_title}")
            can.drawString(80, y_position - 20, f"Location: {process.process_location}")
            
            y_position -= 40
            
            # Get activities for this process
            activities = Activity.query.filter_by(activity_process_id=process.process_id).all()
            
            for j, activity in enumerate(activities):
                can.drawString(100, y_position, f"Activity {j+1}: {activity.work_activity}")
                
                y_position -= 20
                
                # Get hazards for this activity
                hazards = Hazard.query.filter_by(hazard_activity_id=activity.activity_id).all()
                
                for k, hazard in enumerate(hazards):
                    # Get hazard type
                    hazard_type = HazardType.query.get(hazard.hazard_type_id)
                    hazard_type_name = hazard_type.hazard_type if hazard_type else "Unknown"
                    
                    # Get risk
                    risk = Risk.query.filter_by(risk_hazard_id=hazard.hazard_id).first()
                    
                    can.drawString(120, y_position, f"Hazard {k+1}: {hazard.hazard}")
                    can.drawString(120, y_position - 15, f"Type: {hazard_type_name}")
                    can.drawString(120, y_position - 30, f"Injury: {hazard.injury or 'N/A'}")
                    
                    if risk:
                        can.drawString(120, y_position - 45, f"Existing Controls: {risk.existing_risk_control or 'N/A'}")
                        can.drawString(120, y_position - 60, f"Additional Controls: {risk.additional_risk_control or 'N/A'}")
                        can.drawString(120, y_position - 75, f"Severity: {risk.severity}, Likelihood: {risk.likelihood}, RPN: {risk.RPN}")
                    
                    y_position -= 90
                    
                    # If we're running out of space, start a new page
                    if y_position < 100:
                        can.showPage()
                        can.setFont("Helvetica", 10)
                        y_position = 700
                
                y_position -= 20
                
                # If we're running out of space, start a new page
                if y_position < 100:
                    can.showPage()
                    can.setFont("Helvetica", 10)
                    y_position = 700
            
            y_position -= 30
            
            # If we're running out of space, start a new page
            if y_position < 100:
                can.showPage()
                can.setFont("Helvetica", 10)
                y_position = 700
        
        # Add approval information at the end
        if form.approved_by:
            approver = User.query.get(form.approved_by)
            if approver:
                can.drawString(100, y_position, f"Approved by: {approver.user_name}")
                can.drawString(100, y_position - 20, f"Designation: {approver.user_designation}")
        
        can.save()
        
        # Move to the beginning of the BytesIO buffer
        packet.seek(0)
        
        # Create new PDF with Reportlab
        new_pdf = PdfReader(packet)
        
        # Read existing PDF
        existing_pdf = PdfReader(open(template_path, "rb"))
        output = PdfWriter()
        
        # Add the overlay (new_pdf) on the existing page
        for i in range(len(existing_pdf.pages)):
            page = existing_pdf.pages[i]
            if i < len(new_pdf.pages):
                page.merge_page(new_pdf.pages[i])
            output.add_page(page)
        
        # Write the merged PDF to file
        with open(output_path, "wb") as output_stream:
            output.write(output_stream)
        
        # CHANGED: Update PDF URL to match React frontend path
        pdf_url = f"/forms/generated_forms/{output_filename}"
        
        print(f"Generated PDF URL: {pdf_url}")
        print(f"PDF saved to: {output_path}")
        
        return jsonify({
            'success': True,
            'pdf_url': pdf_url,
            'message': 'PDF generated successfully'
        })
        
    except Exception as e:
        import traceback
        print(f"Error generating PDF: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500    
    
# To serve the generated PDFs
@user.route('/download_generated_pdf/<filename>', methods=['GET'])
def download_generated_pdf(filename):
    """Download a generated PDF"""
    try:
        upload_folder = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static', 'generated_pdfs')
        return send_file(
            os.path.join(upload_folder, filename),
            mimetype='application/pdf',
            as_attachment=True,
            download_name=filename
        )
    except Exception as e:
        print(f"Error downloading PDF: {str(e)}")
        return jsonify({'error': str(e)}), 500
from flask import Blueprint, jsonify, request, session
from flask_cors import CORS
from werkzeug.security import generate_password_hash
from models import User, Form, Activity
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

        user_id='1'

        # user_id = session.get('user_id') or request.args.get('user_id')

        print(f"Form model: {Form}")

        forms = Form.query.filter_by(form_user_id=user_id).all()

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
                'approved_by': form.approved_by
            })

        return jsonify(forms_list)
     
    except Exception as e:
        print(f"Error retrieving forms: {e}")
        return jsonify({'error': 'Failed to retrieve forms'}), 500
     


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
            not data.get('processes')):
            return jsonify({"success": False, "error": "Missing required fields"}), 400
    
    try:
        form_id = data.get('form_id')
        current_time = datetime.now()

        if form_id:
            form = Form.query.get(form_id)
            if not form:
                return jsonify({"error": "Form not Found"}), 404
            print(f"Updating existing form with ID: {form_id}")
        else:
            form = Form()
            form.form_user_id = userid
            db.session.add(form)
        
        form.title = data['title']
        form.division = data['division']
        form.process = json.dumps(data['processes'])
        form.last_access_date = current_time  # Set last access date to current time


        db.session.commit()

        # Store form_id in session for persistence across tabs
        session['current_form_id'] = form.form_id

        return jsonify({
            "success": True,
            "form_id": form.form_id,    
            "message": "Form saved successfully",
            "action": "updated" if form_id else "created"
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@user.route('/form2', methods=['POST'])
def form2_save():
    print("\nSAVE FORM 2 CALLED")

    data = request.get_json()
    print(f"Received data: {data}")  # Debug what you're getting

    userid = data.get('userId')
    print(f"current user id:", userid)

    if (not data or 
            not data.get('title') or 
            not data.get('division') or 
            not data.get('processes')):
            return jsonify({"success": False, "error": "Missing required fields"}), 400
    
    try:
        form_id = data.get('form_id')

        if form_id:
            form = Form.query.get(form_id)
            if not form:
                return jsonify({"error": "Form not Found"}), 404
            print(f"Updating existing form with ID: {form_id}")
        else:
            # Try to get form_id from session if not provided in request
            if 'current_form_id' in session:
                form_id = session['current_form_id']
                form = Form.query.get(form_id)
                if not form:
                    form = Form()
                    form.form_user_id = userid
                    db.session.add(form)
            else:
                form = Form()
                form.form_user_id = userid
                db.session.add(form)
        
        form.title = data['title']
        form.division = data['division']
        form.process = json.dumps(data['processes'])

        db.session.commit()

        # Store form_id in session for persistence across tabs
        session['current_form_id'] = form.form_id

        return jsonify({
            "success": True,
            "form_id": form.form_id,
            "message": "Form saved successfully",
            "action": "updated" if form_id else "created"
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@user.route('/store_form_id', methods=['POST'])
def store_form_id():
    data = request.get_json()
    form_id = data.get('form_id')
    
    if not form_id:
        return jsonify({"error": "Missing form_id"}), 400
    
    session['current_form_id'] = form_id
    return jsonify({"success": True, "message": "Form ID stored in session"}), 200

@user.route('/clear_form_id', methods=['POST'])
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
        
        # Convert stored JSON process data back to Python object
        processes = json.loads(form.process) if form.process else []
        
        return jsonify({
            "form_id": form.form_id,
            "title": form.title,
            "division": form.division,
            "processes": processes
        }), 200
    
    except Exception as e:
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
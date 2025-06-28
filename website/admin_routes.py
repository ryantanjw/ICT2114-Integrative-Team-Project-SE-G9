# Fix the import statements
from flask import Blueprint, jsonify, request, session, make_response
from werkzeug.security import generate_password_hash
from models import User, Form, Activity, Process
from . import db
import random
import string
from flask_cors import CORS, cross_origin
from math import ceil


# Create a new blueprint for admin routes
admin = Blueprint('admin', __name__)
CORS(admin, supports_credentials=True)  # Enable credentials support for cookies


# Get all users (admin only)
@admin.route('/get_users', methods=['GET'])
def get_users():
    print("\n=== GET USERS CALLED ===")
    print("Checking authentication and authorization...")
    
    # Check if user is logged in and is an admin
    # if 'user_id' not in session:
    #     print("No active session found")
    #     return jsonify({"success": False, "error": "Not authenticated"}), 401
    
    # if session.get('user_role') != 0:  # 0 = admin
    #     print(f"Non-admin user attempted to access users list. Role: {session.get('user_role')}")
    #     return jsonify({"success": False, "error": "Not authorized"}), 403
    
    try:

        # Query all users from the database
        users = User.query.all()
        
        # Convert users to a list of dictionaries (exclude password for security)
        users_list = []
        
        print("\n=== USERS LIST ===")
        print("| {:<5} | {:<25} | {:<35} | {:<15} | {:<10} |".format(
            "ID", "Name", "Email", "Designation", "Role"
        ))
        print("|" + "-" * 7 + "|" + "-" * 27 + "|" + "-" * 37 + "|" + "-" * 17 + "|" + "-" * 12 + "|")
        
        for user in users:
            # Add user to the list
            users_list.append({
                "user_id": user.user_id,
                "user_name": user.user_name,
                "user_email": user.user_email,
                "user_designation": user.user_designation,
                "user_role": user.user_role,
                "user_cluster": user.user_cluster

            })
            
            # Print user details in a formatted table
            role_text = "Admin" if user.user_role == 0 else "User"
            print("| {:<5} | {:<25} | {:<35} | {:<15} | {:<10} |".format(
                user.user_id,
                user.user_name[:23] + "..." if len(user.user_name) > 23 else user.user_name,
                user.user_email[:33] + "..." if len(user.user_email) > 33 else user.user_email,
                user.user_designation[:13] + "..." if len(user.user_designation) > 13 else (user.user_designation or "N/A"),
                role_text,
                user.user_cluster if user.user_cluster else "N/A"
            ))
        
        print("\n=== END OF USERS LIST ===")
        print(f"Retrieved {len(users_list)} users successfully")
        return jsonify({"success": True, "users": users_list})
        
    except Exception as e:
        print(f"Error retrieving users: {str(e)}")
        import traceback
        traceback.print_exc()  # Print the full traceback for debugging
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
    
    # Check if email already exists
    existing_user = User.query.filter_by(user_email=data['email']).first()
    if existing_user:
        return jsonify({"success": False, "error": "Email already in use"}), 400
    
    try:
        print(f"Creating new user: {data['fullName']} ({data['email']})")
        
        # Create new user - adjust this according to your User model
        new_user = User(
            user_name=data['fullName'],
            user_email=data['email'],
            password=data['password'],  # Make sure to hash this in production!
            user_designation='student',
            user_role=data.get('user_role', 1),  # Default to regular user (1)
            user_cluster=data['programmeCluster']
        )
        
        db.session.add(new_user)
        db.session.commit()
        
        print(f"New user created: {new_user.user_name} (ID: {new_user.user_id})")        
        return jsonify({
            "success": True,
            "user": {
                "user_id": new_user.user_id,
                "user_name": new_user.user_name,
                "user_email": new_user.user_email,
                "user_designation": new_user.user_designation,
                "user_role": new_user.user_role,
                "user_cluster": new_user.user_cluster
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
            status = "draft"  # Default status
            if form.approval == 1:
                status = "approved"
            elif form.approval == 0:
                status = "pending approval"

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
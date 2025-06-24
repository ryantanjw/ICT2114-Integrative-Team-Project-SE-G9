# Fix the import statements
from flask import Blueprint, jsonify, request, session
from werkzeug.security import generate_password_hash
from models import User
from . import db
import random
import string

# Create a new blueprint for admin routes
admin = Blueprint('admin', __name__)

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
    
    # Check if user is logged in and is an admin
    if 'user_id' not in session:
        print("No active session found")
        return jsonify({"success": False, "error": "Not authenticated"}), 401
    
    if session.get('user_role') != 0:  # 0 = admin
        print(f"Non-admin user attempted to add a user. Role: {session.get('user_role')}")
        return jsonify({"success": False, "error": "Not authorized"}), 403
    
    data = request.get_json()
    
    if not data or 'user_name' not in data or 'user_email' not in data or 'password' not in data:
        return jsonify({"success": False, "error": "Missing required fields"}), 400
    
    # Check if email already exists
    existing_user = User.query.filter_by(user_email=data['user_email']).first()
    if existing_user:
        return jsonify({"success": False, "error": "Email already in use"}), 400
    
    try:
        print(f"Creating new user: {data['user_name']} ({data['user_email']})")
        
        # Create new user - adjust this according to your User model
        new_user = User(
            user_name=data['user_name'],
            user_email=data['user_email'],
            password=data['password'],  # Make sure to hash this in production!
            user_designation=data.get('user_designation', ''),
            user_role=data.get('user_role', 1)  # Default to regular user (1)
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
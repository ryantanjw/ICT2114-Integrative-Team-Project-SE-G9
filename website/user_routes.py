from flask import Blueprint, jsonify, request, session
from werkzeug.security import generate_password_hash
from models import User
from . import db
import random
import string
from flask_cors import CORS, cross_origin

# Create a new blueprint for user routes

user = Blueprint('user', __name__,static_folder='static')
CORS(user, supports_credentials=True)  # Enable credentials support for cookies

@user.route('/form1', methods=['POST'])
def base():
    print("ye")
    return jsonify({"success": True})

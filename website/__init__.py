from flask import Flask, request, session
from flask_cors import CORS
from dotenv import load_dotenv
import os
from datetime import timedelta
from services import RiskAssessmentService, RiskAssessmentData, RiskAssessmentRowData


def create_app():
    app = Flask(__name__)
    app.jinja_env.cache = {}
        
    # Use a strong secret key
    app.config['SECRET_KEY'] = "Hello"
    
    # Configure session
    app.config['SESSION_TYPE'] = 'filesystem'
    app.config['SESSION_PERMANENT'] = True
    app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=1)
    
    # Cross-domain session settings - CRITICAL for your issue
    app.config['SESSION_COOKIE_SECURE'] = False  # Set to True in production with HTTPS
    app.config['SESSION_COOKIE_HTTPONLY'] = True
    app.config['SESSION_COOKIE_SAMESITE'] = None  
    
    load_dotenv()
    
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URI') or 'sqlite:///database.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    # Import db from models after app configuration
    from models import db

    db.init_app(app)

    risk_service = RiskAssessmentService(database_url=os.getenv('DATABASE_URI'))
    app.risk_service = risk_service  # Attach to app so it can be accessed via current_app

    # Configure CORS properly for cross-domain cookies
    CORS(app, 
        supports_credentials=True,
        resources={r"/*": {
            "origins": ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173"],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
        }})
    
    # Import and register blueprints
    from .views import views
    from .auth import auth
    from .admin_routes import admin
    from .user_routes import user
    
    app.register_blueprint(views, url_prefix='/')
    app.register_blueprint(auth, url_prefix='/')
    app.register_blueprint(admin, url_prefix='/admin')  
    app.register_blueprint(user, url_prefix='/user')

    # print("Registered routes:")
    # for rule in app.url_map.iter_rules():
    #     print(f"{rule.methods} {rule.rule}")
    
    return app
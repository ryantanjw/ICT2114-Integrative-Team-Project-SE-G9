from flask import Blueprint,render_template,request,redirect,url_for

auth = Blueprint('auth',__name__,static_folder='static')

# This file is a blueprint that has lots of urls, routes!
# Each route has a function which is for this is each view's function

review_sentiment_per=0.0

@auth.route('/login', methods=['GET', 'POST'])  # Make sure to allow both GET and POST methods
def login():
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')

        print(f"Email: {email}")
        print(f"Password: {password}")
        return redirect(url_for('views.home'))  # Replace 'auth.dashboard' with the name of the route you want to redirect to

    return render_template("login.html")
    


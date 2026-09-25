from cs50 import SQL
from flask import Flask, flash, redirect, render_template, request, session, jsonify, json
from flask_session import Session
from werkzeug.security import check_password_hash, generate_password_hash
from datetime import datetime
from helpers import apology, login_required

import base64
app = Flask(__name__)
# Configure CS50 Library to use SQLite database
db = SQL("sqlite:///draw.db")

# Configure session to use filesystem (instead of signed cookies)
app.config["SESSION_PERMANENT"] = False
app.config["SESSION_TYPE"] = "filesystem"
Session(app)

@app.route("/", methods=["GET", "POST"])
def index():
    user = session.get('user_id')
    if request.method == 'POST':
            title = request.form.get('title')
            width = request.form.get('width')
            height = request.form.get('height')
            if user:
                drawing_id = db.execute('INSERT INTO drawing (created_at, last_modified, title, user_id, resolution_width, resolution_height) VALUES(?,?,?,?,?,?)', datetime.now(), datetime.now(), title, user, width, height)
                # redirect to newly created drawing (?)
                return redirect(f'/drawing/{drawing_id}')
            return render_template("index.html")
    else:
        if user:
            drawings = db.execute('SELECT * FROM drawing WHERE user_id = ?', user)
            username = db.execute('SELECT username FROM user WHERE user_id = ?', user)
            for drawing in drawings:
                if not drawing["image_path"]:
                    # use the designated placeholder image if user hasn't saved their canvas on the database yet
                    drawing["image_path"] = f'drawings/placeholder.png'
                with open(drawing['image_path'], 'rb') as image_file:
                    # encode to base64 format the image path on the server so that the client's browser can auto retrieve and format when placed in src attribute of img 
                    # https://www.w3schools.com/python/ref_module_base64.asp
                    image_data = base64.b64encode(image_file.read()).decode()
                    # overwrite image_path to the encoded base 64 format, 
                    drawing["image_path"] = f'data:image/png;base64,{image_data}'
            return render_template("index.html", drawings=drawings, username=username[0]["username"])
        return render_template("index.html")

# learned how to implement variables in routes in web50
@app.route("/drawing/<int:drawing_id>", methods=["GET"])
@login_required
def canvas(drawing_id):
    user = db.execute('SELECT * FROM user WHERE user_id = ?', session['user_id'])
    drawing = db.execute('SELECT * FROM drawing WHERE user_id = ? AND drawing_id = ?', session['user_id'], drawing_id )
    if not drawing:
        return apology("can't access this drawing :P", 403)
    drawing = drawing[0]
    if not drawing["image_path"]:
        return render_template("drawing.html", user=user[0], drawing=drawing)
    # encode image path of each layer into base64, just like what we did with save_to_account to be consistent, also I just really wanna do it
    with open(drawing['image_path'], 'rb') as image_file:
        image_data = base64.b64encode(image_file.read()).decode('utf-8')
        # overwrite the image path key in drawing to replace with the encoded image
        drawing["image_path"] = f'data:image/png;base64,{image_data}'
    return render_template("drawing.html", user=user[0], drawing=drawing)



@app.route("/save_to_account", methods=["POST"])
@login_required
def save_to_account():
    user = session.get('user_id')
    # extracts json from fetch request 
    data = request.get_json()
    drawing_id = data['drawing_id']
    image = data['image']
    drawing = db.execute('SELECT * FROM drawing WHERE drawing_id = ? AND user_id = ?', drawing_id, user)
    # returns a json as to not disrupt the current drawing of a user if any
    if not drawing:
        return jsonify(
            message="save error!"
        )
    # save in drawings path with drawing_id to uniquely identify each drawing, decode the base64 from js
    image_path = f'drawings/{drawing_id}.png'
    # retrieves the second item in the list after the comma to retrieve the actual encoded string
    base64_data = image.split(',')[1]
    binary = base64.b64decode(base64_data)
    # wb learned from: https://www.geeksforgeeks.org/python/python-write-bytes-to-file/
    # write/overwrite image to drawings folder  
    with open(image_path, 'wb') as image_file:
        image_file.write(binary)
    # updates database with the new drawing
    db.execute('UPDATE drawing SET image_path = ?, last_modified = ? WHERE user_id = ? AND drawing_id = ?',  image_path,  datetime.now(), user, drawing_id) 
    return jsonify(
        message="save successful!"
    )


@app.route("/login", methods=["GET", "POST"])
def login():
    """Log user in"""

    # Forget any user_id
    session.clear()

    # User reached route via POST (as by submitting a form via POST)
    if request.method == "POST":
        # Ensure username was submitted
        if not request.form.get("username"):
            return apology("must provide username", 403)

        # Ensure password was submitted
        elif not request.form.get("password"):
            return apology("must provide password", 403)

        # Query database for username
        rows = db.execute(
            "SELECT * FROM user WHERE username = ?", request.form.get("username")
        )

        if len(rows) != 1:
            return apology("invalid username and/or password", 403)
        # Ensure username exists and password is correct
        if len(rows) != 1 or not check_password_hash(
            rows[0]["password_hash"], request.form.get("password")
        ):
            return apology("invalid username and/or password", 403)

        # Remember which user has logged in
        session["user_id"] = rows[0]["user_id"]

        # Redirect user to home pageface
        return redirect("/")

    # User reached route via GET (as by clicking a link or via redirect)
    else:
        return render_template("login.html")

@app.route("/logout")
def logout():
    """Log user out"""

    # Forget any user_id
    session.clear()

    # Redirect user to login form
    return redirect("/")

@app.route("/register", methods=["GET", "POST"])
def register():
    """Register user"""

    # Forget any user_id
    session.clear()
    if request.method == "POST":

        # Query database for username
        if not request.form.get("password") or not request.form.get("confirmation") or not request.form.get("username") or request.form.get("password") != request.form.get("confirmation"):
            return apology("invalid udasdsername and/or password", 400)

        try:
            db.execute(
                "INSERT INTO user (username, password_hash) VALUES(?, ?)", request.form.get(
                    "username"), generate_password_hash(request.form.get("password"))
            )
        except ValueError:
            return apology("invalid udasdsername and/or password", 400)

        rows = db.execute(
            "SELECT user_id FROM user WHERE username = ?", request.form.get("username")
        )
        # Remember which user has logged in
        session["user_id"] = rows[0]["user_id"]
        # Welcome!
        return redirect("/")
    else:
        return render_template("register.html")

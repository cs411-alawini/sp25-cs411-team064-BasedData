from flask import Flask, jsonify, request, g
from flask_cors import CORS
import os
import mysql.connector
from mysql.connector import IntegrityError, errorcode

# Create Flask app ONCE
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Configuration and database setup
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SCHEMA_PATH = os.path.join(BASE_DIR, '../../doc/sqlite_dump.sql')

DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '123456',
    'database': 'curriculum'
}

# Database helper functions
def get_db():
    if 'db' not in g:
        g.db = mysql.connector.connect(**DB_CONFIG)
    return g.db

@app.teardown_appcontext
def close_db(exception):
    db = g.pop('db', None)
    if db is not None:
        db.close()

def execute_query(query, args=(), one=False, commit=False):
    try:
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(query, args)

        if commit:
            conn.commit()
            cursor.close()
            return None

        if one:
            result = cursor.fetchone()
        else:
            result = cursor.fetchall()
        
        cursor.close()
        return result
    except Exception as e:
        print(f"Query execution error: {e}")
        raise

def execute_transaction(queries):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        for query, args in queries:
            cursor.execute(query, args)
        conn.commit()
        return cursor.fetchall()
    except Exception as e:
        conn.rollback()
        print(f"Transaction failed: {e}")
        raise
    finally:
        cursor.close()

# Test routes
@app.route('/')
def home():
    return "Flask server is running!"

@app.route('/test-db')
def test_db():
    try:
        result = execute_query("SELECT * FROM Course_Catalog LIMIT 1", one=True)
        return jsonify({
            "status": "success",
            "message": "Database connection successful",
            "data": result
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

# Course-related routes
@app.route('/api/courses', methods=['GET'])
def get_courses():
    try:
        print("Attempting to fetch courses...")
        courses = execute_query("SELECT * FROM Course_Catalog")
        print(f"Retrieved {len(courses)} courses")
        return jsonify(courses)
    except Exception as e:
        print(f"Error in get_courses: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/courses/search', methods=['GET'])
def search_courses():
    try:
        search_term = request.args.get('q', '').lower()
        query = """
            SELECT CourseID 
            FROM Course_Catalog 
            WHERE LOWER(CourseID) LIKE %s
            LIMIT 50
        """
        courses = execute_query(query, (f"%{search_term}%",))
        return jsonify(courses)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/course/<courseid>/prerequisites', methods=['GET'])
def get_prerequisites(courseid):
    try:
        query = """
            SELECT p.CourseID, p.PrerequisiteID, c.Credits AS PrerequisiteCredits
            FROM Prerequisite p
            JOIN Course_Catalog c ON p.PrerequisiteID = c.CourseID
            WHERE p.CourseID = %s
        """
        prerequisites = execute_query(query, (courseid,))
        return jsonify(prerequisites)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Student-related routes
@app.route('/api/students', methods=['GET'])
def get_students():
    try:
        query = "SELECT * FROM Student"
        students = execute_query(query)
        return jsonify(students)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/student/<netid>/plans', methods=['GET'])
def get_student_plans(netid):
    try:
        query = """
            SELECT PlanID, CreationDate, NetID
            FROM Academic_Plan
            WHERE NetID IS NOT NULL AND LOWER(NetID) = LOWER(%s)
        """
        plans = execute_query(query, (netid,))
        if not plans:
            return jsonify({"error": "No academic plans found for this student"}), 404
        return jsonify(plans)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Authentication routes
@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        netid = data.get('netid')
        name = data.get('name')

        if not all([netid, name]):
            return jsonify({"error": "NetID and Name are required"}), 400

        user = execute_query(
            "SELECT * FROM Student WHERE NetID = %s AND Name = %s",
            (netid, name),
            one=True
        )

        if user:
            return jsonify({"message": "Login successful!", "user": user}), 200
        return jsonify({"error": "Invalid credentials"}), 401
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/create-account', methods=['POST'])
def create_account():
    try:
        data = request.get_json()
        name = data.get('name')
        netid = data.get('netid')
        major = data.get('majorid')
        graduation = data.get('egrad')

        if not all([name, netid, major, graduation]):
            return jsonify({"error": "All fields are required"}), 400

        existing_student = execute_query(
            "SELECT * FROM Student WHERE NetID = %s",
            (netid,),
            one=True
        )

        if existing_student:
            return jsonify({"error": "Account with this NetID already exists"}), 409

        execute_query(
            "INSERT INTO Student (NetID, Name, Expected_Graduation, MajorID) VALUES (%s, %s, %s, %s)",
            (netid, name, graduation, major),
            commit=True
        )
        return jsonify({"message": "Account created successfully"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Plan-related routes
@app.route('/api/plan/<int:planid>', methods=['GET'])
def get_plan(planid):
    try:
        query = """
            SELECT pc.PlanID, pc.CourseID, pc.Semester, cc.Credits
            FROM Planned_Course pc
            JOIN Course_Catalog cc ON pc.CourseID = cc.CourseID
            WHERE pc.PlanID = %s
        """
        courses = execute_query(query, (planid,))
        return jsonify(courses)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/ap-courses', methods=['GET'])
def get_unique_ap_courses():
    try:
        print("Fetching unique AP courses...")
        query = """
        SELECT DISTINCT CourseName 
        FROM AP_Credits 
        ORDER BY CourseName
        """
        courses = execute_query(query)
        print(f"Found AP courses: {courses}")
        return jsonify(courses)
    except Exception as e:
        print(f"Error fetching AP courses: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/ap-course-mapping', methods=['GET'])
def get_ap_course_mapping():
    try:
        course_name = request.args.get('courseName')
        score = request.args.get('score')
        
        if not course_name or not score:
            return jsonify({"error": "Course name and score are required"}), 400
        
        query = """
        SELECT CourseID 
        FROM AP_Credits 
        WHERE LOWER(CourseName) = LOWER(%s) AND Score = %s
        """
        
        result = execute_query(query, (course_name, score), one=True)
        if result:
            return jsonify(result)
        return jsonify({"error": "No course mapping found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Plan Management routes
@app.route('/api/plan', methods=['POST'])
def add_plan():
    try:
        data = request.get_json()
        netid = data.get('netid')

        if not netid:
            return jsonify({"error": "NetID is required"}), 400

        # Find the lowest available PlanID
        query = "SELECT MAX(PlanID) AS max_planid FROM Academic_Plan"
        result = execute_query(query, one=True)
        max_planid = result["max_planid"] if result["max_planid"] is not None else 0
        new_planid = max_planid + 1

        # Add the new plan with only the date
        execute_query(
            "INSERT INTO Academic_Plan (PlanID, CreationDate, NetID) VALUES (%s, DATE(NOW()), %s)",
            (new_planid, netid),
            commit=True
        )
        return jsonify({"message": f"Plan added successfully with PlanID {new_planid}.", "planid": new_planid}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/course', methods=['POST'])
def add_course():
    try:
        data = request.get_json()
        planid = data.get('planid')
        courseid = data.get('courseid').strip().upper()
        semester = data.get('semester').strip().upper()

        print(f"Received payload: PlanID={planid}, CourseID={courseid}, Semester={semester}")

        if not all([planid, courseid, semester]):
            return jsonify({"error": "All fields (planid, courseid, semester) are required"}), 400

        # Check if the PlanID exists
        plan_exists = execute_query("SELECT 1 FROM Academic_Plan WHERE PlanID = %s", (planid,), one=True)
        if not plan_exists:
            return jsonify({"error": f"PlanID {planid} does not exist"}), 404

        # Check if CourseID exists
        course_exists = execute_query(
            "SELECT 1 FROM Course_Catalog WHERE LOWER(CourseID) = LOWER(%s)", 
            (courseid,), 
            one=True
        )
        if not course_exists:
            return jsonify({"error": f"CourseID {courseid} does not exist in Course_Catalog"}), 404

        # Check for duplicate entries
        duplicate_check = execute_query(
            "SELECT 1 FROM Planned_Course WHERE PlanID = %s AND CourseID = %s",
            (planid, courseid),
            one=True
        )
        if duplicate_check:
            return jsonify({"error": f"Course {courseid} is already added to PlanID {planid}"}), 409

        # Add the course
        execute_query(
            "INSERT INTO Planned_Course (PlanID, CourseID, Semester) VALUES (%s, %s, %s)",
            (planid, courseid, semester),
            commit=True
        )
        return jsonify({"message": f"Course {courseid} added to PlanID {planid} successfully"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/plan/<int:planid>', methods=['DELETE'])
def delete_plan(planid):
    try:
        execute_query("DELETE FROM Academic_Plan WHERE PlanID = %s", (planid,), commit=True)
        return jsonify({"message": "Plan deleted successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/plan/<int:planid>/course/<courseid>', methods=['DELETE'])
def delete_course(planid, courseid):
    try:
        print(f"Attempting to delete CourseID={courseid.upper()} from PlanID={planid}")
        execute_query(
            "DELETE FROM Planned_Course WHERE PlanID = %s AND LOWER(CourseID) = LOWER(%s)",
            (planid, courseid),
            commit=True
        )
        return jsonify({"message": f"Course {courseid} removed from PlanID {planid} successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Prerequisite Graph route
@app.route('/api/course/<courseid>/prerequisite-graph', methods=['GET'])
def get_prerequisite_graph(courseid):
    try:
        def fetch_prerequisites(courseid, visited):
            if courseid in visited:
                return []
            visited.add(courseid)
            query = """
                SELECT p.CourseID, p.PrerequisiteID
                FROM Prerequisite p
                WHERE p.CourseID = %s
            """
            prerequisites = execute_query(query, (courseid,))
            edges = [{"from": prereq["PrerequisiteID"], "to": prereq["CourseID"]} 
                    for prereq in prerequisites]
            for prereq in prerequisites:
                edges.extend(fetch_prerequisites(prereq["PrerequisiteID"], visited))
            return edges

        visited = set()
        graph_edges = fetch_prerequisites(courseid, visited)
        nodes = [{"id": course, "label": course} for course in visited]
        return jsonify({"nodes": nodes, "edges": graph_edges})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Credits and Requirements routes
@app.route('/api/students/total-credits/<netid>', methods=['GET'])
def get_total_credits(netid):
    try:
        query = """
        SELECT DISTINCT s.NetID, s.Name, SUM(cc.Credits) AS Total_Planned_Credits
        FROM Student s
        JOIN Academic_Plan ap ON s.NetID = ap.NetID
        JOIN Planned_Course pc ON ap.PlanID = pc.PlanID
        JOIN Course_Catalog cc ON pc.CourseID = cc.CourseID
        WHERE s.NetID = %s
        GROUP BY s.NetID, s.Name
        ORDER BY Total_Planned_Credits DESC
        LIMIT 15;
        """
        queries = [(query, (netid,))]
        result = execute_transaction(queries)
        return jsonify(result)
    except Exception as e:
        print(f"Failed to fetch total credits for NetID {netid}: {e}")
        return jsonify({"error": f"Failed to fetch total credits for NetID {netid}"}), 500

@app.route('/api/students/requirements/<netid>', methods=['GET'])
def find_students_fulfilling_requirements(netid):
    try:
        query = """
        SELECT DISTINCT s.NetID, s.Name, r.MajorID, r.CourseID
        FROM Student s
        JOIN Academic_Plan ap ON s.NetID = ap.NetID
        JOIN Planned_Course pc ON ap.PlanID = pc.PlanID
        JOIN Requirement r ON r.CourseID = pc.CourseID
        WHERE r.MajorID = s.MajorID AND s.NetID = %s
        LIMIT 15;
        """
        queries = [(query, (netid,))]
        result = execute_transaction(queries)
        return jsonify(result)
    except Exception as e:
        print(f"Failed to fetch requirements for NetID {netid}: {e}")
        return jsonify({"error": f"Failed to fetch requirements for NetID {netid}"}), 500

@app.route('/api/majors', methods=['GET'])
def get_majors():
    try:
        query = "SELECT DISTINCT MajorID FROM Requirement"
        majors = execute_query(query)
        return jsonify(majors)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)
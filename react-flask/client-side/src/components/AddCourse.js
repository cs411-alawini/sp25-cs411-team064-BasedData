import React from 'react';
import './AddCourse.css'; // Import the CSS file

function AddCourse() {
    const numbers = Array.from({ length: 11 }, (_, i) => 1 + i * 0.5);
    
  return (
    <div id="add-course-container">
      <h1>Add Course</h1>
      <form id="add-course-form" action="/action_page.php">

        <label htmlFor="courseid">CourseID</label>
        <input
          type="text"
          id="majorid"
          name="majorid"
          placeholder="CS 411"
        />

        <label htmlFor="credits">Credits</label>
        <input type="text" id="name" name="name" placeholder="3" />

        <input type="submit" value="Submit" class="courseSub"/>
      </form>
    </div>
  );
}

export default AddCourse;

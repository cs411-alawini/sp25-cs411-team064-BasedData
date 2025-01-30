import React from 'react';
import './About.css';

function About() {
  return (
    <div>
        <div class="about-container">
    <header>
      <h1>Curriculum Crafter</h1>
    </header>

    <section class="project-summary">
      <h2>Project Summary</h2>
      <p>
        Our project is a web application that assists learners in designing their own customized lesson plans. It creates a plan based on data from previous courses, transfer credits, AP credits, and competency test scores. The app allows users to input their academic objectives and desired courses, and it generates a personalized plan that illustrates the most efficient route to graduation. It takes into account variables such as course prerequisites, graduation requirements, and the potential for early graduation. Students can easily identify their academic route thanks to the user-friendly design, which also helps them track their progress toward their degree and make informed class selections.
      </p>
    </section>

    <section class="description">
      <h2>Description of the Application</h2>
      <h3>What We Want to Do:</h3>
      <ul>
        <li>Accumulate academic data from student history and map it with Transferology, AP credits, and departmental policies.</li>
        <li>Generate a course graph based on student inputs like interests, major, and expected graduation timeline.</li>
        <li>Optimize graduation paths by analyzing course prerequisites, graduation requirements, and credit overlaps.</li>
        <li>Provide visual tools such as interactive timelines and progress charts to help students track their academic journey.</li>
      </ul>
    </section>

    <section class="problem">
      <h3>Problem We Want to Solve</h3>
      <p>
        Students often face challenges in planning their course schedules, especially when juggling various credits and requirements. This app aims to address this issue by providing a comprehensive, user-friendly tool that takes the guesswork out of academic planning. It will streamline the process, reduce confusion, and help students stay on track towards their academic goals, ultimately making their educational experience more efficient and less stressful.
      </p>
    </section>

    <section class="creative-component">
      <h2>Good Creative Component</h2>
      <p>
        We are planning on making an interactive academic map visualization for the creative component. This feature would provide a dynamic visual representation of a student’s entire academic journey, courses they’re currently taking, courses already taken and future courses. Each course would be seen as a node on the map, connected to related courses through prerequisites and corequisites.
      </p>
      <p>
        The map will offer real-time updates as students adjust their course plans or enter new information. The map would automatically update to reflect any changes made, including how they impact graduation timelines and prerequisites.
      </p>
    </section>

    <section class="realness">
      <h2>Realness</h2>
      <p>
        The project will leverage a variety of datasets to obtain data for comprehensive academic and college course planning. These sources include AP course credit policies, the Course Explorer, and proficiency test policies. Additionally, Transferology will be used to support transfer students by identifying course equivalencies from other institutions.
      </p>
    </section>

    <section class="usefulness">
      <h2>Usefulness</h2>
      <p>
        Every student encounters stress every semester as they try to figure out what to register for and how to plan their degree. This web tool aims to simplify the process, provide better visualization, and tailor course plans to individual student needs.
      </p>
    </section>

    <section class="data-sources">
      <h2>Data Sources</h2>
      <ul>
        <li><a href="https://citl.illinois.edu/citl-101/measurement-evaluation/placement-proficiency/cutoffs-2024-2025/2024-advanced-placement-program" target="_blank">2024 Advanced Placement Program</a></li>
        <li><a href="https://citl.illinois.edu/citl-101/measurement-evaluation/placement-proficiency/proficiency-testing/subjects-with-proficiency-exams" target="_blank">Departmental Proficiency Exams</a></li>
        <li><a href="https://www.transferology.com/index.htm" target="_blank">Transferology</a></li>
        <li><a href="https://courses.illinois.edu/" target="_blank">Course Explorer</a></li>
      </ul>
    </section>

    <section class="work-distribution">
      <h2>Work Distribution</h2>
      <ul>
        <li>Kundan Mergu: Frontend Development, UI/UX Design, Data Visualization</li>
        <li>Vashishth Goswami: Backend Development, Data Integration, API Requests</li>
        <li>Karthik Bagavathy: Data Collection, Data Cleaning, Data Analysis</li>
        <li>Harshita Thota: Project Management, Documentation, Testing, Product Design</li>
      </ul>
    </section>
    
  </div>
    </div>
  )
}

export default About;

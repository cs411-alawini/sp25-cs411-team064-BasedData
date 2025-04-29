const express = require('express');
const mysql = require('mysql2');
const path = require('path');
const app = express();
const port = 80;

// MySQL connection setup
const connection = mysql.createConnection({
  host: '34.170.179.247',
  user: 'joey',
  password: 'password',
  database: 'MedMatch'
});

connection.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err.stack);
    return;
  }
  console.log('Connected to MySQL (MedMatch)');
});

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Set up EJS view engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// === ROUTES ===

// Landing page
app.get('/', (req, res) => {
  res.render('index', { title: 'Add User' });
});

// Handle user form submission (no symptoms anymore)
app.post('/submit', (req, res) => {
  const { name, age, gender } = req.body;

  const sql = 'INSERT INTO USERS (Username, Age, Gender) VALUES (?, ?, ?)';
  connection.query(sql, [name, age, gender], (err, result) => {
    if (err) {
      console.error('Error inserting into USERS:', err);
      return res.status(500).send('Database error');
    }
    const userId = result.insertId;
    res.redirect(`/home/${userId}`);
  });
});

// Home page (dashboard)
app.get('/home/:userId', (req, res) => {
  const userId = req.params.userId;
  res.render('home', { userId });
});

// Delete user
app.get('/delete/:userId', (req, res) => {
  const userId = req.params.userId;

  const sqlDelete = 'DELETE FROM USERS WHERE User_ID = ?';
  connection.query(sqlDelete, [userId], (err, result) => {
    if (err) {
      console.error('Error deleting user:', err);
      return res.status(500).send('Database error');
    }
    res.send('<h1>Your account has been deleted.</h1><a href="/">Return to Start</a>');
  });
});

// ===== Symptoms flow =====

// Input symptoms page
app.get('/input-symptoms/:userId', (req, res) => {
  const userId = req.params.userId;
  res.render('inputSymptoms', { userId });
});

// Handle input symptoms
app.post('/input-symptoms/:userId', (req, res) => {
  const { symptoms } = req.body;
  const symptomList = symptoms
    .split(',')
    .map(item => item.trim().toLowerCase())
    .filter(item => item.length > 0);

  if (symptomList.length === 0) {
    return res.send('No symptoms entered.');
  }

  const placeholders = symptomList.map(() => '?').join(', ');

  const sqlDiseaseMatch = `
    SELECT d.Disease_ID, d.Disease_Name, COUNT(*) AS match_count
    FROM DISEASES d
    JOIN DISEASE_SYMPTOM ds ON d.Disease_ID = ds.Disease_ID
    JOIN SYMPTOMS s ON s.Symptom_ID = ds.Symptom_ID
    WHERE LOWER(s.Symptom_Name) IN (${placeholders})
    GROUP BY d.Disease_ID, d.Disease_Name
    ORDER BY match_count DESC;
  `;

  connection.query(sqlDiseaseMatch, symptomList, (err, diseaseResults) => {
    if (err) {
      console.error('Error matching diseases:', err);
      return res.status(500).send('Database error');
    }
    const userId = req.params.userId;
    res.render('diagnosis', { diseases: diseaseResults, userId });
  });
});

// ===== Drug flow =====

// Search drug manually
app.get('/search-drug/:userId', (req, res) => {
  const userId = req.params.userId;
  res.render('searchDrugManual', { userId, drugs: [] });
});

app.post('/search-drug/:userId', (req, res) => {
  const userId = req.params.userId;
  const { drugName } = req.body;

  const sql = `
    SELECT Drug_ID, Name, Type
    FROM DRUGS
    WHERE LOWER(Name) LIKE ?;
  `;

  const searchPattern = `%${drugName.toLowerCase()}%`;

  connection.query(sql, [searchPattern], (err, results) => {
    if (err) {
      console.error('Error searching for drug:', err);
      return res.status(500).send('Database error');
    }

    res.render('searchDrugManual', { userId, drugs: results });
  });
});

// ===== Disease flow =====

// Search disease manually
app.get('/search-disease/:userId', (req, res) => {
  const userId = req.params.userId;
  res.render('searchDisease', { userId, diseases: [] });
});

app.post('/search-disease/:userId', (req, res) => {
  const userId = req.params.userId;
  const { diseaseName } = req.body;

  const sql = `
    SELECT Disease_ID, Disease_Name
    FROM DISEASES
    WHERE LOWER(Disease_Name) LIKE ?;
  `;

  const searchPattern = `%${diseaseName.toLowerCase()}%`;

  connection.query(sql, [searchPattern], (err, results) => {
    if (err) {
      console.error('Error searching for disease:', err);
      return res.status(500).send('Database error');
    }

    res.render('searchDisease', { userId, diseases: results });
  });
});

// After selecting disease
app.get('/select-disease/:diseaseId/:userId', (req, res) => {
  const diseaseId = req.params.diseaseId;
  const userId = req.params.userId;

  const sql = `
    SELECT drugs.Drug_ID, drugs.Name AS Drug_Name, drugs.Type
    FROM DRUGS drugs
    INNER JOIN DRUG_DISEASE dd ON drugs.Drug_ID = dd.Drug_ID
    WHERE dd.Disease_ID = ?;
  `;

  connection.query(sql, [diseaseId], (err, drugResults) => {
    if (err) {
      console.error('Error fetching drugs:', err);
      return res.status(500).send('Database error');
    }

    if (drugResults.length === 0) {
      return res.render('drugs', { userId, drugs: [], reviews: [] });
    }

    const drugIds = drugResults.map(drug => drug.Drug_ID);
    const placeholders = drugIds.map(() => '?').join(', ');

    const reviewSql = `
      SELECT r.Review_ID, r.User_ID, r.Drug_ID, r.Comment, r.Rating, d.Name AS Drug_Name
      FROM DRUG_REVIEW r
      INNER JOIN DRUGS d ON r.Drug_ID = d.Drug_ID
      WHERE r.Drug_ID IN (${placeholders});
    `;

    connection.query(reviewSql, drugIds, (err2, reviewResults) => {
      if (err2) {
        console.error('Error fetching reviews:', err2);
        return res.status(500).send('Database error');
      }

      res.render('drugs', { userId, drugs: drugResults, reviews: reviewResults });
    });
  });
});

// ===== Drug view and reviews =====

// View specific drug and reviews
app.get('/view-drug/:drugId/:userId', (req, res) => {
  const drugId = req.params.drugId;
  const userId = req.params.userId;

  const sqlDrug = 'SELECT * FROM DRUGS WHERE Drug_ID = ?';
  const sqlReviews = `
    SELECT r.Review_ID, r.User_ID, r.Drug_ID, r.Comment, r.Rating, u.Username
    FROM DRUG_REVIEW r
    INNER JOIN USERS u ON r.User_ID = u.User_ID
    WHERE r.Drug_ID = ?;
  `;
  const sqlDiseases = `
    SELECT d.Disease_Name
    FROM DISEASES d
    JOIN DRUG_DISEASE dd ON d.Disease_ID = dd.Disease_ID
    WHERE dd.Drug_ID = ?;
  `;

  connection.query(sqlDrug, [drugId], (err, drugResults) => {
    if (err) {
      console.error('Error fetching drug:', err);
      return res.status(500).send('Database error');
    }
    if (drugResults.length === 0) {
      return res.send('Drug not found.');
    }

    const drug = drugResults[0];

    connection.query(sqlReviews, [drugId], (err2, reviewResults) => {
      if (err2) {
        console.error('Error fetching reviews:', err2);
        return res.status(500).send('Database error');
      }

      connection.query(sqlDiseases, [drugId], (err3, diseaseResults) => {
        if (err3) {
          console.error('Error fetching diseases:', err3);
          return res.status(500).send('Database error');
        }

        res.render('viewDrug', { userId, drug, reviews: reviewResults, diseases: diseaseResults });
      });
    });
  });
});

// Leave a review
app.get('/review/:drugId/:userId', (req, res) => {
  const drugId = req.params.drugId;
  const userId = req.params.userId;

  const sql = 'SELECT Name FROM DRUGS WHERE Drug_ID = ?';
  connection.query(sql, [drugId], (err, results) => {
    if (err) {
      console.error('Error fetching drug:', err);
      return res.status(500).send('Database error');
    }
    const drugName = results.length > 0 ? results[0].Name : "Unknown Drug";
    res.render('review', { drugId, userId, drugName });
  });
});

// Handle review submission using stored procedure + transaction

app.post('/submit-review/:drugId/:userId', (req, res) => {
  const drugId = req.params.drugId;
  const userId = req.params.userId;
  const { rating, comment } = req.body;

  connection.beginTransaction((err) => {
    if (err) {
      console.error('Error starting transaction:', err);
      return res.status(500).send('Database transaction error');
    }

    // Call the new stored procedure
    const callProc = 'CALL insert_review_and_count(?, ?, ?, ?, @review_count)';
    connection.query(callProc, [userId, drugId, comment, rating], (err, result) => {
      if (err) {
        console.error('Error calling stored procedure:', err);
        return connection.rollback(() => {
          res.status(500).send('Database error during procedure call');
        });
      }

      // Now fetch the review count
      connection.query('SELECT @review_count AS reviewCount', (err, rows) => {
        if (err) {
          console.error('Error fetching review count:', err);
          return connection.rollback(() => {
            res.status(500).send('Database error fetching review count');
          });
        }

        connection.commit((err) => {
          if (err) {
            console.error('Commit error:', err);
            return connection.rollback(() => {
              res.status(500).send('Database commit error');
            });
          }

          const reviewCount = rows[0].reviewCount;
          res.send(`<h1>Review Submitted Successfully!</h1><p>You have now submitted ${reviewCount} reviews!</p><a href="/home/${userId}">Return to Home</a>`);
        });
      });
    });
  });
});




// Edit review
app.get('/edit-review/:reviewId/:userId', (req, res) => {
  const reviewId = req.params.reviewId;
  const userId = req.params.userId;

  const sql = `
    SELECT r.Review_ID, r.Rating, r.Comment, r.Drug_ID, d.Name AS Drug_Name
    FROM DRUG_REVIEW r
    INNER JOIN DRUGS d ON r.Drug_ID = d.Drug_ID
    WHERE r.Review_ID = ?;
  `;

  connection.query(sql, [reviewId], (err, results) => {
    if (err) {
      console.error('Error fetching review:', err);
      return res.status(500).send('Database error');
    }
    if (results.length === 0) {
      return res.send('Review not found.');
    }
    const review = results[0];
    res.render('editReview', { userId, review });
  });
});

app.post('/edit-review/:reviewId/:userId', (req, res) => {
  const reviewId = req.params.reviewId;
  const userId = req.params.userId;
  const { rating, comment } = req.body;

  const sqlUpdate = `
    UPDATE DRUG_REVIEW
    SET Rating = ?, Comment = ?
    WHERE Review_ID = ?;
  `;

  connection.query(sqlUpdate, [rating, comment, reviewId], (err, result) => {
    if (err) {
      console.error('Error updating review:', err);
      return res.status(500).send('Database error');
    }
    res.render('reviewSuccess', { userId });
  });
});

// Route to view the Review Log
app.get('/view-log/:userId', (req, res) => {
  const userId = req.params.userId;

  const sql = 'SELECT * FROM Review_Log ORDER BY Created_At DESC';
  connection.query(sql, (err, logs) => {
    if (err) {
      console.error('Error fetching review logs:', err);
      return res.status(500).send('Database error');
    }
    res.render('viewReviewLog', { logs, userId });
  });
});


// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

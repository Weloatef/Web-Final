const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs'); 
const mysql = require('mysql2');
const session = require('express-session');

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

app.set('view engine', 'ejs');

/////////////////////////////// mysql connection  ////////////////////////////////////
// Create a MySQL connection
const connection = mysql.createConnection({
  host: '127.0.0.1', // MySQL host
  user: 'root', // MySQL username
  password: 'V5zstf23@', // MySQL password
  database: 'webfinal' // MySQL database name
});

// Connect to the database
connection.connect((err) => {
    if (err) {
        console.error('Error connecting to database:', err);
        return;
    }
    console.log('Connected to MySQL database');
    
    // Create the departments table if it doesn't exist
    connection.query(`CREATE TABLE IF NOT EXISTS departments (
        ID INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255)
    )`, (err) => {
        if (err) {
            console.error('Error creating departments table:', err);
            return;
        }
        console.log('departments table created');
        // Insert initial data into departments table if it's empty
        connection.query(`SELECT COUNT(*) AS count FROM departments`, (err, result) => {
            if (err) {
                console.error('Error checking departments table:', err);
                return;
            }
            if (result[0].count === 0) {
                connection.query(`INSERT INTO departments (name) VALUES ('admins')`, (err) => {
                    if (err) {
                        console.error('Error inserting data into departments table:', err);
                        return;
                    }
                    console.log('Initial data inserted into departments table');
                });
            }
        });
    });

    // Create the employees table if it doesn't exist
    connection.query(`CREATE TABLE IF NOT EXISTS employees (
        ID INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255),
        password VARCHAR(255),
        department INT,
        FOREIGN KEY (department) REFERENCES departments(ID)
    )`, (err) => {
        if (err) {
            console.error('Error creating employees table:', err);
            return;
        }
        console.log('employees table created');

        // Insert initial data into employees table if it's empty
        connection.query(`SELECT COUNT(*) AS count FROM employees`, (err, result) => {
            if (err) {
                console.error('Error checking employees table:', err);
                return;
            }
            if (result[0].count === 0) {
                connection.query(`INSERT INTO employees (username, password, department) VALUES ('admin', '1234', 1)`, (err) => {
                    if (err) {
                        console.error('Error inserting data into employees table:', err);
                        return;
                    }
                    console.log('Initial data inserted into employees table');
                });
            }
        });
    });

    // Create the loginHistory table if it doesn't exist
    connection.query(`CREATE TABLE IF NOT EXISTS loginHistory (
        ID INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255),
        logindate DATETIME
    )`, (err) => {
        if (err) {
            console.error('Error creating loginHistory table:', err);
            return;
        }
        console.log('loginHistory table created');
    });
});

// Set up session middleware
app.use(
  session({
    secret: 'webfinal',
    resave: false,
    saveUninitialized: true
  })
);

app.get('/', (req, res) => {
    res.render('index'); 
});


app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    connection.query("SELECT * FROM employees where Username = ? AND Password = ? ", [username, password], (err, results) => {
      if (err) {
        console.error('Error fetching employees:', err);
        res.status(500).json({ success: false, message: 'Error fetching employees' });
        return;
      }
      if (results.length > 0){
        req.session.loggedin = true;
        req.session.username = username;
        res.redirect('/Dashboard'); 
      } else {
        res.status(500).json({ success: false, message: 'Wrong Credentials' });
      }
      
    });
});

app.get('/Dashboard', (req, res) => {

    if (!req.session.loggedin) {
      res.redirect('/');
      return;
    }
  
    connection.query('SELECT * FROM employees', (err, employeesResults) => {
      if (err) {
        console.error('Error fetching employees:', err);
        res.status(500).json({ error: 'Error fetching employees' });
        return;
      }
  
      connection.query('SELECT * FROM departments', (err, derpartmentsResults) => {
        if (err) {
          console.error('Error fetching departments', err);
          res.status(500).json({ error: 'Error fetching departments' });
          return;
        }
  
        res.status(200).render('Dashboard', { employees: employeesResults, departments: derpartmentsResults, username: req.session.username });
      });
    });
  
  });

app.get('/loginHistory', (req, res) => {
    if (!req.session.loggedin) {
        res.redirect('/');
        return;
    }

    connection.query('SELECT * FROM loginHistory', (err, loginHistoryResults) => {
        if (err) {
            console.error('Error fetching login history:', err);
            res.status(500).json({ error: 'Error fetching login history' });
            return;
        }

        res.status(200).render('loginHistory', { loginHistory: loginHistoryResults, username: req.session.username });
    });

});
app.post('/api/adduser', (req, res) => {
    const { username, password, department } = req.body;

    connection.query(
        'INSERT INTO employees (username, password, department) VALUES (?, ?, ?)',
        [username, password, department],
        (err, result) => {
            if (err) {
                console.error('Error inserting data:', err);
                res.status(500).json({ error: 'Error inserting data' });
                return;
            }

            if(result.affectedRows == 1)
                res.status(200).json({ success: true, id: result.insertId, username: username, password: password, department: department });
        }
    );

});

app.post('/api/deleteuser', (req, res) => {
    const { userId } = req.body;

    connection.query(
        'DELETE FROM employees WHERE ID = ?',
        [userId],
        (err, result) => {
            if (err) {
                console.error('Error deleting employee:', err);
                res.status(500).json({ error: 'Error deleting employee' });
                return;
            }

            if (result.affectedRows === 1) {
                res.status(200).json({ success: true, message: 'Employee deleted successfully' });
            } else {
                res.status(404).json({ success: false, message: 'Employee not found' });
            }
        }
    );
});

app.post('/api/addDepartment', (req, res) => {
  const { name } = req.body;

  connection.query(
    'INSERT INTO departments (name) VALUES (?)',
    [name],
    (err, result) => {
      if (err) {
        console.error('Error inserting data:', err);
        res.status(500).json({ error: 'Error inserting data' });
        return;
      }

      if(result.affectedRows == 1)
        res.status(200).json({ success: true, id: result.insertId, name: name });
    }
  );

});

app.post('/api/addlogintime', (req, res) => {
    const { username, logindate } = req.body;

    if (!username || !logindate) {
        res.status(400).json({ error: 'Username and logindate values are required' });
        return;
    }

    connection.query(
        'INSERT INTO loginHistory (username, logindate) VALUES (?, ?)',
        [username, logindate],
        (err, result) => {
            if (err) {
                console.error('Error inserting data:', err);
                res.status(500).json({ error: 'Error inserting data' });
                return;
            }

            if (result.affectedRows == 1)
                res.status(200).json({ success: true, id: result.insertId, username: username, logindate: logindate });
        }
    );

});

app.post('/api/signout', (req, res) => {
  req.session.loggedin = null;
  req.session.username = null;

  res.status(200).json({ success: true, message: 'Success' });
  res.redirect('/'); // Redirect to the index page

});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log("http://localhost:3000");
});

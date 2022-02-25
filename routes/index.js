var express = require('express');
const { render } = require('express/lib/response');
var router = express.Router();
var path = require('path');
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database(path.join(__dirname, '..', '..', 'express', 'db', 'todo.db'));
const bcrypt = require('bcrypt');
const saltRounds = 10;


function isLoggedIn(req, res, next){
  if(req.session.user) {
    next()
  }else {
    res.redirect('/login')
  }
}

router.get('/login', function(req, res){
  res.render('login', {loginMessage: req.flash('loginMessage')})
})

router.post("/login", function (req, res){
  const email = req.body.email
  const password =req.body.password

  db.get("select * from user where email = ?",[email],(err, user) =>{ 
    if (err) {
      req.flash('loginMessage', 'Gagal Login')
      return res.redirect("/login")
    }
    if (!user) {
      req.flash('loginMessage', 'User Tidak DiTemukan')
      return res.redirect("/login")
    }
    bcrypt.compare(password, user.password, function(err, result) {
      if(result){
      req.session.user = user
      res.redirect("/")
      } else {
        req.flash('loginMessage', 'Password salah')
        return res.redirect("/login")
      }
    });
  });
      
  })


router.get('/register', function(req, res){
  res.render('register')
})


router.post("/register", function (req, res){
  const email = req.body.email
  const fullname = req.body.fullname
  const password =req.body.password
  
  
  bcrypt.hash(password, saltRounds, function(err, hash) {
  db.run("insert into user (email, password, fullname)values(?, ?, ?)",[email, hash, fullname],(err) =>{
    if (err) return res.send("register failed")
    res.redirect("/login")
    });
  })
})


router.get('/logout', function(req, res){
  req.session.destroy(function(err) {
    res.redirect('/login')
  })
})




router.get('/', isLoggedIn, function (req, res,) {

  const url = req.url == "/" ? "/?page=1" : req.url

  const params = []


  if (req.query.task) {
    params.push(`task like '%${req.query.task}%'`)
  }
  if (req.query.complete) {
    params.push(`complete = ${req.query.complete}`)
  }


  const page = req.query.page || 1
  const limit = 3
  const offset = (page - 1) * limit
  let sql = `select count(*) as total from todo`;
  if (params.length > 0) {
    sql += ` where ${params.join('and')}`
  }

  db.get(sql, (err, row) => {
    const pages = Math.ceil(row.total / limit)
    sql = "select * from todo"
    if (params.length > 0) {
      sql += ` where ${params.join(' and ')}`
    }

    sql += ` limit ? offset ? `
    console.log(sql)
    db.all(sql, [limit, offset], (err, rows) => {
      if (err) return res.send(err)
      res.render('list', { data: rows, page, pages, query: req.query, url, user: req.session.user});
    })
  })
})

router.get('/add',isLoggedIn, function (req, res) {
  res.render('add')
})

router.post('/add', function (req, res) {
  let task = req.body.task
  //Quary Binding
  db.run('insert into todo(task) values (?)', [task], (err) => {
    if (err) return res.send(err)
    res.redirect('/')
  })
})

router.get('/delete/:id',isLoggedIn, function (req, res) {
  const id = req.params.id
  db.run('delete from todo where id = ?', [Number(id)], (err) => {
    if (err) return res.send(err)
    res.redirect('/')
  })
})

router.get('/edit/:id',isLoggedIn, function (req, res) {
  const id = req.params.id
  db.get('select * from todo where id = ?', [Number(id)], (err, item) => {
    if (err) return res.send(err)
    res.render('edit', { data: item })
  })
})

router.post('/edit/:id',isLoggedIn, function (req, res) {
  const id = Number(req.params.id)
  const task = req.body.task
  const complete = JSON.parse(req.body.complete)
  db.run('update todo set task = ?, complete = ? where id = ?', [task, complete, id], (err, row) => {
    if (err) return res.send(err)
    res.redirect('/')
  })
})

module.exports = router;

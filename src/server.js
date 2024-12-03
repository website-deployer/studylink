const express = require('express');
const path = require('path');
const session = require('express-session');
const passport = require('passport');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(session({
    secret: process.env.SESSION_SECRET || 'studylink-secret-key-KlH4S93BE',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Passport setup
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => {
    done(null, { id: 1, email: 'user@example.com' });
});

// Auth middleware
const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) return next();
    res.redirect('/login?redirect=' + encodeURIComponent(req.originalUrl));
};

// Route handlers
app.get('/', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'public/pages/index.html'));
});

app.get('/about', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'public/pages/about.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'public/pages/login.html'));
});

app.get('/privacy', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'public/pages/privacy.html'));
});

app.get('/terms', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'public/pages/terms.html'));
});

app.get('/faq', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'public/pages/faq.html'));
});

// Simplified login route
app.post('/login', (req, res) => {
    const user = {
        id: 1,
        email: req.body.email,
        name: 'User'
    };
    
    req.login(user, (err) => {
        if (err) return res.status(500).json({ message: 'Error logging in' });
        const redirectTo = req.query.redirect || '/aihelp';
        res.json({ redirect: redirectTo });
    });
});

app.get('/logout', (req, res) => {
    req.logout(() => {
        req.session.destroy();
        res.redirect('/');
    });
});

// Protected routes
app.get('/aihelp', isAuthenticated, (req, res) => {
    res.sendFile(path.join(process.cwd(), 'views/aihelp.html'));
});

// API routes
app.get('/api/user', isAuthenticated, (req, res) => {
    res.json({
        name: 'User',
        email: 'user@example.com'
    });
});

// Static file serving
app.use(express.static('public'));

// Error handling
app.use((req, res) => {
    res.status(404).sendFile(path.join(process.cwd(), 'public/pages/404.html'));
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

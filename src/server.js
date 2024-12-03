const express = require('express');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const bcrypt = require('bcryptjs');

const app = express();
const port = process.env.PORT || 3000;

// In-memory user store (replace with database in production)
const users = [];

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

// Google OAuth Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.NODE_ENV === 'production' 
        ? 'https://studylink-hgla.onrender.com/auth/google/callback'
        : '/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
    try {
        let user = users.find(u => u.googleId === profile.id);
        if (!user) {
            user = {
                id: users.length + 1,
                googleId: profile.id,
                email: profile.emails[0].value,
                name: profile.displayName
            };
            users.push(user);
        }
        return done(null, user);
    } catch (error) {
        return done(error, null);
    }
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => {
    const user = users.find(u => u.id === id);
    done(null, user);
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

// Auth routes
app.post('/register', async (req, res) => {
    const { email, password, name } = req.body;
    
    if (users.find(u => u.email === email)) {
        return res.status(400).json({ message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = {
        id: users.length + 1,
        email,
        password: hashedPassword,
        name
    };
    users.push(user);
    
    req.login(user, (err) => {
        if (err) return res.status(500).json({ message: 'Error logging in' });
        res.redirect('/aihelp');  // Changed from res.json to res.redirect
    });
});

// Update the login route
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email);
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }

    req.login(user, (err) => {
        if (err) return res.status(500).json({ message: 'Error logging in' });
        const redirectTo = req.query.redirect || '/aihelp';
        res.json({ redirect: redirectTo });  // Change back to res.json
    });
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email);
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }

    req.login(user, (err) => {
        if (err) return res.status(500).json({ message: 'Error logging in' });
        const redirectTo = req.query.redirect || '/aihelp';
        res.redirect(redirectTo);  // Changed from res.json to res.redirect
    });
});

app.get('/auth/google',
    passport.authenticate('google', { 
        scope: ['profile', 'email'],
        prompt: 'select_account'
    })
);

app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
        const redirectTo = req.session.returnTo || '/aihelp';
        delete req.session.returnTo;
        res.redirect(redirectTo);
    }
);

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
        name: req.user.name,
        email: req.user.email
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

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const routes = require('./src/routes');

const app = express();

// Configure CORS for frontend communication (Vercel/Netlify)
app.use(cors());

// Increase JSON payload limit to handle base64 audio/images
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Register all API routes
app.use('/api', routes);

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err.message);
    console.error(err.stack);

    const response = { error: 'Internal Server Error' };
    if (process.env.NODE_ENV !== 'production') {
        response.message = err.message;
    }

    res.status(500).json(response);
});

// Bind to process.env.PORT for Railway
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Faceless Reels AI Backend running on port ${PORT}`);
});

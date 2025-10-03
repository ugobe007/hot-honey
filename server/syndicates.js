// server/syndicates.js

const express = require('express');
const router = express.Router();

let syndicates = [];

// POST - create a new syndicate
router.post('/', (req, res) => {
  const { name, lead, investors } = req.body;
  if (!name || !lead) {
    return res.status(400).json({ error: 'Name and lead are required.' });
  }
  const newSyndicate = {
    id: Date.now().toString(),
    name,
    lead,
    investors: investors || [],
  };
  syndicates.push(newSyndicate);
  res.status(201).json(newSyndicate);
});

// GET - list all syndicates
router.get('/', (req, res) => {
  res.json(syndicates);
});

module.exports = router;


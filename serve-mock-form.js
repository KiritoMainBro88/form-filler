const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;

const server = http.createServer((req, res) => {
    console.log(`📥 Request: ${req.method} ${req.url}`);
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    if (req.url === '/' || req.url === '/mock-form') {
        // Serve the T-shirt mock form
        const mockFormPath = path.join(__dirname, 'mock-tshirt-form.html');
        
        fs.readFile(mockFormPath, 'utf8', (err, data) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Error loading mock form');
                return;
            }
            
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(data);
        });
    } else if (req.url === '/comprehensive-form') {
        // Serve the comprehensive mock form
        const comprehensiveFormPath = path.join(__dirname, 'mock-comprehensive-form.html');
        console.log(`📁 Loading comprehensive form from: ${comprehensiveFormPath}`);
        
        fs.readFile(comprehensiveFormPath, 'utf8', (err, data) => {
            if (err) {
                console.error(`❌ Error loading comprehensive form: ${err.message}`);
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Error loading comprehensive form');
                return;
            }
            
            console.log(`✅ Comprehensive form loaded, size: ${data.length} characters`);
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(data);
        });
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
});

server.listen(PORT, () => {
    console.log(`🚀 Mock form server running at:`);
    console.log(`   📝 T-shirt Form: http://localhost:${PORT}/mock-form`);
    console.log(`   🧪 Comprehensive Form: http://localhost:${PORT}/comprehensive-form`);
    console.log('🛑 Press Ctrl+C to stop');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    server.close(() => {
        console.log('✅ Server stopped');
        process.exit(0);
    });
});

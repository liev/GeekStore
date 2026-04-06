const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    console.log("Launching Puppeteer...");
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    const baseDir = "C:\\Users\\Laptop\\.gemini\\antigravity\\brain\\0e08ca5b-1c5d-4434-a4b3-f3af2030e249\\artifacts";

    // 1. Home
    console.log("Capturing Home...");
    await page.goto('http://localhost:5174/', { waitUntil: 'load' });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: `${baseDir}\\ss_home.png` });

    // 2. Login
    console.log("Capturing Login...");
    await page.goto('http://localhost:5174/login', { waitUntil: 'load' });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: `${baseDir}\\ss_login.png` });

    // 3. Register
    console.log("Capturing Register...");
    await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const regBtn = buttons.find(b => b.textContent.includes('CONVIÉRTETE EN GOBLIN'));
        if (regBtn) regBtn.click();
    });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: `${baseDir}\\ss_register.png` });

    // 4. Register Seller showing plans
    console.log("Capturing Seller Register...");
    await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const sellerBtn = buttons.find(b => b.textContent.includes('MERCADER'));
        if (sellerBtn) sellerBtn.click();
    });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: `${baseDir}\\ss_register_seller.png` });

    // Mock Backend APIs for Dashboard & Catalog
    await page.setRequestInterception(true);
    page.on('request', (req) => {
        const url = req.url();
        if (url.includes('/api/products/seller')) {
            req.respond({
                status: 200,
                contentType: 'application/json',
                headers: { "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify([
                    { id: 1, name: "Charizard Holográfico Base Set", price: 250000, stock: 1, categoryName: "TCG / Cartas Sueltas", condition: "Mint", isPaused: false, images: [{url: "https://picsum.photos/200/300" }] },
                    { id: 2, name: "Pikachu Illustrator Proxy", price: 15000, stock: 5, categoryName: "TCG", condition: "Good", isPaused: true, images: [{url: "https://picsum.photos/201/300" }] }
                ])
            });
        } else if (url.includes('/api/settings/plans')) {
            req.continue(); // Let the real API handle settings if possible
        } else if (url.includes('/api/auth/me')) {
            req.respond({
                status: 200,
                contentType: 'application/json',
                headers: { "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({ id: 1, name: "Vendedor1", email: "ventas@goblin.com", role: "Goblin Worker" })
            });
        } else if (url.includes('/api/products/1')) {
            req.respond({
                status: 200,
                contentType: 'application/json',
                headers: { "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({
                    id: 1, name: "Charizard Holográfico Base Set", price: 250000, 
                    description: "Se vende carta en perfecto estado, nunca jugada. Lista para graduar.",
                    sellerName: "TCG Store CR", condition: "Mint", conditionDetails: "Perfect condition, PSA 10", 
                    categoryId: 5, categoryName: "Cartas Sueltas", stock: 1,
                    images: [{ url: "https://picsum.photos/400/600", isPrimary: true }]
                })
            });
        } else if (url.includes('/api/products') && req.method() === 'GET') {
            req.respond({
                status: 200,
                contentType: 'application/json',
                headers: { "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({
                    items: [
                        { id: 1, name: "Charizard Holográfico Base Set", price: 250000, originalPrice: null, sellerName: "TCG Store CR", condition: "Mint", conditionDetails: "Perfect condition, PSA 10", imageUrls: ["https://picsum.photos/200/300"] },
                        { id: 3, name: "Caja Sellada Pokemon 151", price: 45000, originalPrice: null, sellerName: "PokeMarket", condition: "New", imageUrls: ["https://picsum.photos/202/300"] }
                    ],
                    totalCount: 2
                })
            });
        } else if (url.includes('/api/categories')) {
             req.respond({
                status: 200,
                contentType: 'application/json',
                headers: { "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify([
                    { id: 1, name: "TCG", subCategories: [{id: 5, name: "Cartas Sueltas"}] },
                    { id: 2, name: "Figuras", subCategories: [] }
                ])
            });
        } else {
            req.continue();
        }
    });

    // Generate a Fake JWT to bypass frontend protection
    const fakePayload = {
        sub: "1",
        email: "ventas@goblin.com",
        role: "Goblin Worker",
        exp: Math.floor(Date.now() / 1000) + (60 * 60)
    };
    const fakeToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." + btoa(JSON.stringify(fakePayload)).replace(/=/g, '') + ".fake_signature";

    console.log("Capturing Dashboard...");
    await page.evaluate((token) => {
        localStorage.setItem('goblinspot_token', token);
    }, fakeToken);

    await page.goto('http://localhost:5174/dashboard', { waitUntil: 'load' });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: `${baseDir}\\ss_dashboard.png` });

    // Click "Nuevo Producto"
    console.log("Capturing Dashboard Add Product omitted to avoid crash...");

    console.log("Capturing Catalog...");
    await page.goto('http://localhost:5174/catalog', { waitUntil: 'load' });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: `${baseDir}\\ss_catalog.png` });

    console.log("Capturing Product Detail...");
    await page.goto('http://localhost:5174/catalog/1', { waitUntil: 'load' });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: `${baseDir}\\ss_product_detail.png` });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: `${baseDir}\\ss_product_detail.png` });

    console.log("Screenshots completed successfully.");
    await browser.close();
})();

document.addEventListener('DOMContentLoaded', () => {
    // Références aux éléments du DOM
    const cartCountSpan = document.getElementById('cart-count');
    const cartItemsDiv = document.getElementById('cart-items');
    const cartTotalSpan = document.getElementById('cart-total');
    const checkoutBtn = document.getElementById('checkout-btn');
    const clearCartBtn = document.getElementById('clear-cart-btn');
    const navLinks = document.querySelectorAll('.nav-link');
    const submenuDiv = document.getElementById('submenu');

    let products = []; // Pour stocker tous les produits chargés
    let cart = JSON.parse(localStorage.getItem('cart')) || {}; // Le panier

    // --- Fonction Toast Notification ---
    function showToast(message) {
        const container = document.getElementById('toast-container');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.classList.add('toast');
        toast.textContent = `>> SYSTEM: ${message}`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    // --- Utilitaires ---
    function sanitizeId(text) {
        return 'type-' + text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }

    // --- Gestion de la Navigation et des Vues ---

    function showView(viewId) {
        document.querySelectorAll('.view').forEach(view => {
            view.style.display = 'none'; 
        });
        
        const activeView = document.getElementById(viewId);
        if (activeView) {
            activeView.style.display = 'block'; 
            if (viewId === 'cart-view') {
                renderCart();
            }
        }

        navLinks.forEach(link => {
            link.classList.remove('active-link');
            if(link.dataset.view === viewId) {
                link.classList.add('active-link');
            }
        });

        updateSubmenu(viewId);
    }

    // --- Gestion du Sous-menu Dynamique ---
    function updateSubmenu(viewId) {
        submenuDiv.innerHTML = ''; // Nettoyer le sous-menu

        const catalogueName = viewId.replace('-view', '');
        
        const relevantProducts = products.filter(p => 
            p.Catalogue.toLowerCase().replace(/\s+/g, '-').replace(/'/g, '-') === catalogueName
        );

        if (relevantProducts.length === 0) return;

        const currentCatalogueRaw = relevantProducts[0].Catalogue;
        const types = [...new Set(relevantProducts.map(p => p.Type))].sort();

        types.forEach(type => {
            const btn = document.createElement('button');
            btn.textContent = type;
            btn.classList.add('submenu-btn');
            
            btn.onclick = () => {
                const targetId = sanitizeId(currentCatalogueRaw + '-' + type);
                const targetElement = document.getElementById(targetId);
                const container = document.getElementById(viewId); 

                if (targetElement && container) {
                    const topPos = targetElement.offsetTop - 20;
                    container.scrollTo({
                        top: topPos,
                        behavior: 'smooth'
                    });
                }
            };
            submenuDiv.appendChild(btn);
        });
    }


    // --- Fonctions de gestion du Panier ---

    function updateCartCount() {
        const totalItems = Object.values(cart).reduce((sum, item) => sum + item.quantity, 0);
        cartCountSpan.textContent = totalItems;
    }

    function calculateCartTotal() {
        const total = Object.values(cart).reduce((sum, item) => sum + (item.Prix * item.quantity), 0);
        cartTotalSpan.textContent = total.toFixed(0) + ' €';
    }

    function addToCart(productId) {
        const product = products.find(p => p.id === String(productId));
        
        if (product) {
            if (cart[productId]) {
                cart[productId].quantity++;
            } else {
                cart[productId] = { ...product, quantity: 1 };
            }
            localStorage.setItem('cart', JSON.stringify(cart));
            updateCartCount();
            showToast(`${product.Nom} AJOUTÉ AU PANIER`);
        }
    }

    function updateQuantity(productId, change) {
        if (cart[productId]) {
            const newQuantity = cart[productId].quantity + change;

            if (newQuantity <= 0) {
                removeItemFromCart(productId);
            } else {
                cart[productId].quantity = newQuantity;
                localStorage.setItem('cart', JSON.stringify(cart));
                renderCart();
            }
        }
    }

    function removeItemFromCart(productId) {
        if (cart[productId]) {
            delete cart[productId];
            localStorage.setItem('cart', JSON.stringify(cart));
            renderCart();
        }
    }

    function clearCart() {
        if (confirm("Voulez-vous vraiment vider votre panier ?")) {
            cart = {};
            localStorage.removeItem('cart');
            renderCart();
            showToast("PANIER VIDÉ");
        }
    }

    // --- MODIFICATION : Fonction Checkout Mise à jour ---
    function checkout() {
        if (Object.keys(cart).length === 0) {
            showToast("ERREUR: PANIER VIDE");
            return;
        }

        // 1. Préparation et Tri des articles
        // On convertit l'objet cart en tableau pour pouvoir le trier
        const items = Object.values(cart).sort((a, b) => {
            // Tri principal : Par Catalogue (Alphabétique)
            if (a.Catalogue < b.Catalogue) return -1;
            if (a.Catalogue > b.Catalogue) return 1;
            
            // Tri secondaire : Par Type (Alphabétique)
            if (a.Type < b.Type) return -1;
            if (a.Type > b.Type) return 1;
            
            return 0;
        });

        // 2. Construction du fichier texte
        const date = new Date().toLocaleString('fr-FR');
        // Séparateur plus large pour accueillir les nouvelles colonnes
        const separator = "=".repeat(100); 
        const thinSeparator = "-".repeat(100);
        let grandTotal = 0;

        let invoiceText = `SOLOMART 2000 -- MANIFESTE DE COMMANDE\n`;
        invoiceText += `${separator}\n`;
        invoiceText += `DATE  : ${date}\n`;
        invoiceText += `ID TR : ${Math.random().toString(36).substr(2, 9).toUpperCase()}\n`;
        invoiceText += `${separator}\n\n`;

        // En-têtes de colonnes ajustés
        invoiceText += "CATALOGUE".padEnd(12) + "TYPE".padEnd(18) + "ARTICLE".padEnd(32) + "QTE".padEnd(6) + "PRIX U.".padEnd(12) + "TOTAL".padStart(10) + "\n";
        invoiceText += `${thinSeparator}\n`;

        items.forEach(item => {
            const lineTotal = item.Prix * item.quantity;
            grandTotal += lineTotal;

            // Formatage des données avec troncature si nécessaire pour ne pas casser l'alignement
            const cat = item.Catalogue.substring(0, 11).padEnd(12);
            const type = item.Type.substring(0, 17).padEnd(18);
            const name = item.Nom.substring(0, 30).padEnd(32);
            const qty = ("x" + item.quantity).padEnd(6);
            const unitPrice = (item.Prix.toFixed(0) + " E").padEnd(12);
            const totalLine = (lineTotal.toFixed(0) + " E").padStart(10);

            invoiceText += `${cat}${type}${name}${qty}${unitPrice}${totalLine}\n`;
        });

        invoiceText += `${thinSeparator}\n`;
        invoiceText += `TOTAL A PAYER:`.padEnd(80) + (grandTotal.toFixed(0) + " E").padStart(10) + "\n";
        invoiceText += `${separator}\n\n`;
        invoiceText += "MERCI DE VOTRE VISITE, CHOOM.\n";
        invoiceText += "TRANSMISSION TERMINEE.\n";

        // 3. Téléchargement
        const blob = new Blob([invoiceText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `SOLOMART_FACTURE_${Date.now()}.txt`;
        document.body.appendChild(a);
        a.click();
        
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // 4. Feedback (SANS vider le panier)
        showToast("FACTURE GÉNÉRÉE AVEC SUCCÈS");
    }

    function renderCart() {
        if (!cartItemsDiv) return;
        cartItemsDiv.innerHTML = '';

        if (Object.keys(cart).length === 0) {
            cartItemsDiv.innerHTML = '<p>Votre panier est vide.</p>';
        } else {
            Object.values(cart).forEach(item => {
                const cartItemDiv = document.createElement('div');
                cartItemDiv.classList.add('cart-item');
                cartItemDiv.dataset.productId = item.id;
                
                const imgSrc = item.Image;
                
                cartItemDiv.innerHTML = `
                    <img src="${imgSrc}" alt="${item.Nom}" onerror="this.onerror=null;this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'60\\' height=\\'60\\' viewBox=\\'0 0 60 60\\'><rect width=\\'60\\' height=\\'60\\' fill=\\'transparent\\' stroke=\\'%23FFB300\\' stroke-width=\\'2\\'/></svg>';">
                    <div class="cart-item-details">
                        <h3>${item.Nom}</h3>
                    </div>
                    <p class="cart-item-price">${parseFloat(item.Prix).toFixed(0)} €</p>
                    <div class="cart-item-quantity">
                        <button class="quantity-btn decrease-quantity-btn">-</button>
                        <span class="quantity-text">${item.quantity}</span>
                        <button class="quantity-btn increase-quantity-btn">+</button>
                    </div>
                    <p class="cart-item-line-total">${(item.Prix * item.quantity).toFixed(0)} €</p>
                `;
                cartItemsDiv.appendChild(cartItemDiv);
            });
        }
        attachCartButtonListeners();
        calculateCartTotal();
        updateCartCount();
    }
    
    function attachCartButtonListeners() {
        cartItemsDiv.querySelectorAll('.decrease-quantity-btn').forEach(b => b.onclick = () => updateQuantity(b.closest('.cart-item').dataset.productId, -1));
        cartItemsDiv.querySelectorAll('.increase-quantity-btn').forEach(b => b.onclick = () => updateQuantity(b.closest('.cart-item').dataset.productId, 1));
    }


    // --- Fonctions de chargement et d'affichage des produits ---

    async function fetchCsvAndParse(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const text = await response.text();
            
            const lines = text.trim().split('\n');
            const headers = lines[0].split(';').map(h => h.trim());
            headers[0] = headers[0].replace(/^\uFEFF/, '');
            
            const data = [];

            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(';');
                if (values.length < headers.length) continue;

                let item = {};
                item.id = String(i); // Génération d'ID

                headers.forEach((header, index) => {
                    const value = values[index] ? values[index].trim().replace(/"/g, '') : '';
                    item[header] = header === 'Prix' ? parseFloat(value) : value;
                });
                data.push(item);
            }
            return data;
        } catch (error) {
            console.error("Erreur lors de la récupération du CSV:", error);
            return [];
        }
    }
    
    function createProductCard(product) {
        const card = document.createElement('div');
        card.classList.add('product-card');

        let powerHtml = '';
        if (product.Pouvoir && product.Pouvoir.trim() !== '') {
            let powerLabel = '';
            if (product.Catalogue === 'Armes') {
                powerLabel = 'Dégâts : ';
            } else if (product.Catalogue === 'Implants') {
                powerLabel = "Humanité : ";
            }
            powerHtml = `<p class="product-power">${powerLabel}${product.Pouvoir}</p>`;
        }

        const img = document.createElement('img');
        img.src = product.Image;
        img.alt = product.Nom;
        img.onerror = function() {
            this.onerror = null;
            this.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="transparent" stroke="%23FFB300" stroke-width="2"/><text x="50%" y="50%" fill="%23FFB300" dominant-baseline="middle" text-anchor="middle" font-family="monospace">NO IMG</text></svg>';
        };

        card.innerHTML = `
            <h2>${product.Nom}</h2>
            <p class="product-brand">${product.Marque}</p>
            <div class="product-description">${product.Description}</div>
            <p class="product-mode">${product.Mode}</p>
            ${powerHtml}
            <p class="price color-yellow">${parseFloat(product.Prix).toFixed(0)} €</p>
            <button class="action-btn add-to-cart-btn color-red" data-product-id="${product.id}">Ajouter au Panier</button>
        `;
        card.prepend(img);
        card.querySelector('.add-to-cart-btn').addEventListener('click', (e) => {
            addToCart(e.target.dataset.productId);
        });
        return card;
    }

    function renderCataloguePages() {
        const catalogues = [...new Set(products.map(p => p.Catalogue))];

        catalogues.forEach(catalogue => {
            const viewId = catalogue.toLowerCase().replace(/\s+/g, '-').replace(/'/g, '-') + '-view';
            const view = document.getElementById(viewId);
            if (!view) return;

            view.innerHTML = `<h2 class="catalogue-title color-white">${catalogue}</h2>`;
            
            const productsInCatalogue = products.filter(p => p.Catalogue === catalogue);
            const types = [...new Set(productsInCatalogue.map(p => p.Type))];

            types.forEach(type => {
                const typeHeader = document.createElement('h3');
                typeHeader.classList.add('type-title', 'color-green');
                typeHeader.textContent = type;
                
                typeHeader.id = sanitizeId(catalogue + '-' + type);
                
                view.appendChild(typeHeader);

                const productGrid = document.createElement('div');
                productGrid.classList.add('product-grid');
                
                productsInCatalogue.filter(p => p.Type === type).forEach(product => {
                    productGrid.appendChild(createProductCard(product));
                });
                view.appendChild(productGrid);
            });
        });
    }

    async function init() {
        products = await fetchCsvAndParse('produits.csv');
        if (products.length > 0) {
            renderCataloguePages();
        } else {
            document.querySelectorAll('.catalogue-view').forEach(view => {
                view.innerHTML = `<p class="color-red">Erreur de chargement des produits.</p>`;
            });
        }
        
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                showView(e.target.dataset.view);
            });
        });

        checkoutBtn.addEventListener('click', checkout);
        clearCartBtn.addEventListener('click', clearCart);

        updateCartCount();
        showView('accueil-view');
    }

    init();
});
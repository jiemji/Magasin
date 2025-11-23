document.addEventListener('DOMContentLoaded', () => {
    // Références aux éléments du DOM
    const cartCountSpan = document.getElementById('cart-count');
    const cartItemsDiv = document.getElementById('cart-items');
    const cartTotalSpan = document.getElementById('cart-total');
    const checkoutBtn = document.getElementById('checkout-btn');
    const clearCartBtn = document.getElementById('clear-cart-btn');
    const navLinks = document.querySelectorAll('.nav-link');

    let products = []; // Pour stocker tous les produits chargés
    let cart = JSON.parse(localStorage.getItem('cart')) || {}; // Le panier

    // --- Gestion de la Navigation et des Vues ---

    function showView(viewId) {
        document.querySelectorAll('.view').forEach(view => {
            view.style.display = 'none'; // Utilise le style direct pour cacher
        });
        const activeView = document.getElementById(viewId);
        if (activeView) {
            activeView.style.display = 'block'; // Affiche la vue active
            if (viewId === 'cart-view') {
                renderCart(); // Rafraîchir le panier quand on l'affiche
            }
        }
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
        const product = products.find(p => p.id === productId);
        if (product) {
            if (cart[productId]) {
                cart[productId].quantity++;
            } else {
                cart[productId] = { ...product, quantity: 1 };
            }
            localStorage.setItem('cart', JSON.stringify(cart));
            updateCartCount();
            console.log(`Produit ajouté : ${product.Nom}`);
        } else {
            console.error(`Produit avec l'ID ${productId} non trouvé.`);
        }
    }

    function updateQuantity(productId, change) {
        if (cart[productId]) {
            cart[productId].quantity += change;
            if (cart[productId].quantity <= 0) {
                delete cart[productId];
            }
            localStorage.setItem('cart', JSON.stringify(cart));
            renderCart();
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
        }
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
                cartItemDiv.innerHTML = `
                    <img src="images/${item.Image}" alt="${item.Nom}">
                    <div class="cart-item-details">
                        <h3 class="color-yellow">${item.Nom}</h3>
                        <p class="color-amber">${parseFloat(item.Prix).toFixed(0)} € / pièce</p>
                    </div>
                    <div class="cart-item-quantity">
                        <button class="quantity-btn decrease-quantity-btn">-</button>
                        <span class="color-white">${item.quantity}</span>
                        <button class="quantity-btn increase-quantity-btn">+</button>
                    </div>
                    <button class="remove-item-btn">Supprimer</button>
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
        cartItemsDiv.querySelectorAll('.remove-item-btn').forEach(b => b.onclick = () => removeItemFromCart(b.closest('.cart-item').dataset.productId));
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
                let item = {};
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

        // --- Début de la logique conditionnelle pour le "Pouvoir" ---
        let powerHtml = '';
        if (product.Pouvoir && product.Pouvoir.trim() !== '') {
            let powerLabel = '';
            if (product.Catalogue === 'Armes') {
                powerLabel = 'Dégâts : ';
            } else if (product.Catalogue === 'Implants') {
                powerLabel = "Perte d'humanité : ";
            }
            powerHtml = `<p class="product-power">${powerLabel}${product.Pouvoir}</p>`;
        }
        // --- Fin de la logique ---

        card.innerHTML = `
            <img src="images/${product.Image}" alt="${product.Nom}">
            <h2>${product.Nom}</h2>
            <p class="product-brand">${product.Marque}</p>
            <p class="product-description">${product.Description}</p>
            <p class="product-mode">${product.Mode}</p>
            ${powerHtml}
            <p class="price color-yellow">${parseFloat(product.Prix).toFixed(0)} €</p>
            <button class="action-btn add-to-cart-btn color-red" data-product-id="${product.id}">Ajouter au Panier</button>
        `;
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

    // --- Initialisation ---

    async function init() {
        products = await fetchCsvAndParse('produits.csv');
        if (products.length > 0) {
            renderCataloguePages();
        } else {
            document.querySelectorAll('.catalogue-view').forEach(view => {
                view.innerHTML = `<p class="color-red">Erreur de chargement des produits. Vérifiez la console.</p>`;
            });
        }
        
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                showView(e.target.dataset.view);
            });
        });

        checkoutBtn.addEventListener('click', () => alert("Fonctionnalité de paiement non implémentée."));
        clearCartBtn.addEventListener('click', clearCart);

        updateCartCount();
        showView('accueil-view');
    }

    init();
});
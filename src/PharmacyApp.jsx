import React, { useState, useEffect } from "react";
import "./PharmacyBillingApp.css";

// Replace this with your SheetDB API endpoint URL.
const SHEETDB_URL = "https://sheetdb.io/api/v1/fltl2wbu69rkj";

// Component to add new products (also saves to Google Sheet via SheetDB)
const ProductForm = ({ onAddProduct, refreshProducts }) => {
  const [product, setProduct] = useState({
    name: "",
    price: "",
    discount: "",
    stock: ""
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newProduct = {
      ...product,
      price: parseFloat(product.price),
      discount: parseFloat(product.discount),
      stock: parseInt(product.stock, 10),
      id: Date.now() // Local id (SheetDB may assign its own id if needed)
    };

    // POST new product data to Google Sheet via SheetDB
    try {
      const response = await fetch(SHEETDB_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: newProduct })
      });
      if (!response.ok) {
        throw new Error("Failed to add product");
      }
      alert("Product added successfully!");
      onAddProduct(newProduct);
      setProduct({ name: "", price: "", discount: "", stock: "" });
      refreshProducts(); // Refresh the product list from Google Sheet
    } catch (error) {
      console.error("Error adding product:", error);
      alert("Error adding product.");
    }
  };

  return (
    <div>
      <h2>Add Product</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Name"
          value={product.name}
          onChange={(e) => setProduct({ ...product, name: e.target.value })}
          required
        />
        <input
          type="number"
          placeholder="Price"
          step="0.01"
          value={product.price}
          onChange={(e) => setProduct({ ...product, price: e.target.value })}
          required
        />
        <input
          type="number"
          placeholder="Discount (%)"
          step="0.01"
          value={product.discount}
          onChange={(e) => setProduct({ ...product, discount: e.target.value })}
          required
        />
        <input
          type="number"
          placeholder="Stock Quantity"
          value={product.stock}
          onChange={(e) => setProduct({ ...product, stock: e.target.value })}
          required
        />
        <button type="submit">Add Product</button>
      </form>
    </div>
  );
};

// Component to display the inventory (list of products) with remove functionality
const ProductList = ({ products, onRemoveProduct }) => (
  <div>
    <h2>Inventory</h2>
    <table border="1" cellPadding="5" style={{ width: "100%", marginBottom: "20px" }}>
      <thead>
        <tr>
          <th>Name</th>
          <th>Price</th>
          <th>Discount (%)</th>
          <th>Stock</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        {products.map(prod => (
          <tr key={prod.id}>
            <td>{prod.name}</td>
            <td>₹{prod.price.toFixed(2)}</td>
            <td>{prod.discount}</td>
            <td>{prod.stock}</td>
            <td>
              <button onClick={() => onRemoveProduct(prod.id)}>Remove</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// Component to sell a product and generate an invoice
const SellProduct = ({ products, onSellProduct }) => {
  const [selectedId, setSelectedId] = useState("");
  const [quantity, setQuantity] = useState(1);

  const handleSell = (e) => {
    e.preventDefault();
    onSellProduct(selectedId, parseInt(quantity, 10));
    setSelectedId("");
    setQuantity(1);
  };

  return (
    <div>
      <h2>Sell Product</h2>
      <form onSubmit={handleSell}>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          required
        >
          <option value="">Select Product</option>
          {products.map(prod => (
            <option key={prod.id} value={prod.id}>
              {prod.name} (In Stock: {prod.stock})
            </option>
          ))}
        </select>
        <input
          type="number"
          placeholder="Quantity"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          min="1"
          required
        />
        <button type="submit">Sell</button>
      </form>
    </div>
  );
};

// Component to display the invoice (bill)
const Invoice = ({ invoiceData, onPrint }) => {
  if (!invoiceData) return null;

  const { product, quantity, total, discountAmount } = invoiceData;
  return (
    <div className="invoice">
      <h2>Invoice</h2>
      <p><strong>Product:</strong> {product.name}</p>
      <p><strong>Quantity:</strong> {quantity}</p>
      <p><strong>Unit Price:</strong> ₹{product.price.toFixed(2)}</p>
      <p>
        <strong>Discount per unit:</strong> ₹{(product.price * product.discount / 100).toFixed(2)}
      </p>
      <p><strong>Total Discount:</strong> ₹{discountAmount.toFixed(2)}</p>
      <p><strong>Total Amount:</strong> ₹{total.toFixed(2)}</p>
      <button onClick={onPrint}>Print Invoice</button>
    </div>
  );
};

// Main Pharmacy App Component
const PharmacyApp = () => {
  const [products, setProducts] = useState([]);
  const [invoiceData, setInvoiceData] = useState(null);

  // Function to load products from the Google Sheet via SheetDB (GET request)
  const loadProductsFromSheet = () => {
    fetch(SHEETDB_URL)
      .then(response => response.json())
      .then(data => {
        // Assuming the JSON response has a property "data" which is an array of products.
        // Adjust these field names based on your Google Sheet column headers.
        const productsFromSheet = data.data.map(item => ({
          id: item.id, // If your SheetDB returns an id, otherwise generate one.
          name: item.name,
          price: parseFloat(item.price),
          discount: parseFloat(item.discount),
          stock: parseInt(item.stock, 10)
        }));
        setProducts(productsFromSheet);
      })
      .catch(error => console.error("Error fetching sheet data:", error));
  };

  // Load products from the Google Sheet when the component mounts
  useEffect(() => {
    loadProductsFromSheet();
  }, []);

  // Add new product manually (this adds to local state; you already POST in ProductForm)
  const addProduct = (newProduct) => {
    setProducts([...products, newProduct]);
  };

  // Remove a product from the Google Sheet and local state
  const removeProduct = (productId) => {
    // Call DELETE API on SheetDB endpoint
    fetch(`${SHEETDB_URL}/id/${productId}`, {
      method: "DELETE"
    })
      .then(response => {
        if (response.ok) {
          alert("Product removed successfully!");
          loadProductsFromSheet(); // Refresh product list
        } else {
          throw new Error("Failed to remove product");
        }
      })
      .catch(error => {
        console.error("Error deleting product:", error);
        alert("Error deleting product.");
      });
  };

  // Sell a product: update stock and generate invoice
  const sellProduct = (productId, quantitySold) => {
    const product = products.find(p => p.id === parseInt(productId, 10));
    if (!product) return;

    if (product.stock < quantitySold) {
      alert("Not enough stock!");
      return;
    }

    // Calculate discount and total amount
    const discountPerUnit = product.price * product.discount / 100;
    const totalDiscount = discountPerUnit * quantitySold;
    const totalAmount = (product.price * quantitySold) - totalDiscount;

    // Update product stock locally (optional: you can also update the sheet with a PATCH request)
    const updatedProducts = products.map(p =>
      p.id === product.id ? { ...p, stock: p.stock - quantitySold } : p
    );
    setProducts(updatedProducts);

    // Set invoice data
    setInvoiceData({
      product,
      quantity: quantitySold,
      discountAmount: totalDiscount,
      total: totalAmount
    });
  };

  // Print the invoice (for example, call window.print)
  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Pharmacy Billing App</h1>
      <ProductForm onAddProduct={addProduct} refreshProducts={loadProductsFromSheet} />
      <ProductList products={products} onRemoveProduct={removeProduct} />
      <SellProduct products={products} onSellProduct={sellProduct} />
      <Invoice invoiceData={invoiceData} onPrint={handlePrint} />
    </div>
  );
};

export default PharmacyApp;

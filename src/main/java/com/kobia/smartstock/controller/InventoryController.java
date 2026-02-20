package com.kobia.smartstock.controller;

import com.kobia.smartstock.entity.Product;
import com.kobia.smartstock.entity.StockTransaction;
import com.kobia.smartstock.entity.User;
import com.kobia.smartstock.repository.ProductRepository;
import com.kobia.smartstock.repository.StockTransactionRepository;
import com.kobia.smartstock.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import com.kobia.smartstock.dto.StockTransactionDTO;
import java.util.stream.Collectors;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/inventory")
public class InventoryController {

    private final ProductRepository productRepository;
    private final StockTransactionRepository transactionRepository;
    private final UserRepository userRepository;

    public InventoryController(ProductRepository productRepository,
                               StockTransactionRepository transactionRepository,
                               UserRepository userRepository) {
        this.productRepository = productRepository;
        this.transactionRepository = transactionRepository;
        this.userRepository = userRepository;
    }

    // 1. View all products (Accessible to anyone with inventory permissions)
    @GetMapping("/products")
    @PreAuthorize("hasAnyAuthority('VIEW_INVENTORY', 'MANAGE_INVENTORY', 'PROCESS_SALE')")
    public ResponseEntity<List<Product>> getAllProducts() {
        return ResponseEntity.ok(productRepository.findAll());
    }

    // 2. Add a new product to the catalog (Store Manager / Clerk)
    @PostMapping("/products")
    @PreAuthorize("hasAuthority('MANAGE_INVENTORY')")
    public ResponseEntity<?> addProduct(@RequestBody Product product) {
        if (productRepository.findBySku(product.getSku()).isPresent()) {
            return ResponseEntity.badRequest().body("Product with SKU " + product.getSku() + " already exists.");
        }
        Product saved = productRepository.save(product);
        return ResponseEntity.ok(saved);
    }

    // 3. Update stock levels (Restock, Damage Adjustment, etc.)
    @PostMapping("/stock/update")
    @PreAuthorize("hasAuthority('MANAGE_INVENTORY')")
    public ResponseEntity<?> updateStock(@RequestBody Map<String, Object> request, Authentication auth) {
        String sku = (String) request.get("sku");
        Integer quantity = (Integer) request.get("quantity");
        String type = (String) request.get("transactionType"); // "RESTOCK" or "ADJUSTMENT"
        String notes = (String) request.get("notes");

        Product product = productRepository.findBySku(sku)
                .orElseThrow(() -> new RuntimeException("Product not found"));
        User user = userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Update the actual stock count
        product.setCurrentStock(product.getCurrentStock() + quantity);
        productRepository.save(product);

        // Record the audit trail transaction
        StockTransaction transaction = new StockTransaction();
        transaction.setProduct(product);
        transaction.setHandledBy(user); // Links the action directly to the logged-in user
        transaction.setTransactionType(type);
        transaction.setQuantity(quantity);
        transaction.setNotes(notes);
        transactionRepository.save(transaction);

        return ResponseEntity.ok("Stock updated successfully");
    }

    // 4. Process a Sale (Cashier)
    @PostMapping("/sale")
    @PreAuthorize("hasAuthority('PROCESS_SALE')")
    public ResponseEntity<?> processSale(@RequestBody Map<String, Object> request, Authentication auth) {
        String sku = (String) request.get("sku");
        Integer quantity = (Integer) request.get("quantity"); // The amount being sold

        Product product = productRepository.findBySku(sku)
                .orElseThrow(() -> new RuntimeException("Product not found"));

        // Prevent selling items we don't have
        if (product.getCurrentStock() < quantity) {
            return ResponseEntity.badRequest().body("Insufficient stock for SKU: " + sku);
        }

        User user = userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Deduct the stock
        product.setCurrentStock(product.getCurrentStock() - quantity);
        productRepository.save(product);

        // Record the sale in the audit trail
        StockTransaction transaction = new StockTransaction();
        transaction.setProduct(product);
        transaction.setHandledBy(user);
        transaction.setTransactionType("SALE");
        transaction.setQuantity(-quantity); // Negative quantity because stock is leaving
        transaction.setNotes("Point of Sale transaction");
        transactionRepository.save(transaction);

        return ResponseEntity.ok("Sale processed successfully");
    } // <--- THIS BRACE CLOSES processSale()

    // 5. View Audit Trail (Store Managers Only)
    @GetMapping("/transactions")
    @PreAuthorize("hasAuthority('MANAGE_INVENTORY')")
    public ResponseEntity<List<StockTransactionDTO>> getAuditTrail() {
        List<StockTransactionDTO> auditTrail = transactionRepository.findAll().stream().map(tx -> {
            StockTransactionDTO dto = new StockTransactionDTO();
            dto.setId(tx.getId());
            dto.setSku(tx.getProduct().getSku());
            dto.setProductName(tx.getProduct().getName());
            dto.setHandledBy(tx.getHandledBy().getUsername());
            dto.setTransactionType(tx.getTransactionType());
            dto.setQuantity(tx.getQuantity());
            dto.setNotes(tx.getNotes());
            dto.setTransactionDate(tx.getTransactionDate());
            return dto;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(auditTrail);
    }
} // <--- THIS BRACE CLOSES THE ENTIRE CLASS
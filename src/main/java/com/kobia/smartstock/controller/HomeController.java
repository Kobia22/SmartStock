package com.kobia.smartstock.controller;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class HomeController {

    @GetMapping("/public")
    public String publicEndpoint() {
        return "This is a public endpoint!";
    }

    @GetMapping("/private")
    public String privateEndpoint() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return "This is a private endpoint! Accessed by: " + (auth != null ? auth.getName() : "null");
    }
}
package com.kobia.smartstock.controller;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class DashboardController {

    @GetMapping("/user/dashboard")
    public String userDashboard() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return "Welcome to the User Dashboard, " + auth.getName() + "!";
    }

    @GetMapping("/admin/dashboard")
    public String adminDashboard() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return "Welcome to the Admin Dashboard, " + auth.getName() + "!";
    }
}
package com.kobia.smartstock.dto;

import java.util.Set;

public record UserDTO(Long id, String username, String email, Set<String> permissions) {
}
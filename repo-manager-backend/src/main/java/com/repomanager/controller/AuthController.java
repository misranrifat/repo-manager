package com.repomanager.controller;

import com.repomanager.service.GitHubService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {
    
    private final GitHubService gitHubService;
    
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getAuthStatus() {
        Map<String, Object> response = new HashMap<>();
        
        boolean isAuthenticated = gitHubService.isAuthenticated();
        response.put("authenticated", isAuthenticated);
        
        if (isAuthenticated) {
            response.put("user", gitHubService.getAuthenticatedUser());
            response.put("message", "Successfully authenticated with GitHub");
        } else {
            response.put("message", "Not authenticated. Please set GITHUB_PAT environment variable.");
        }
        
        return ResponseEntity.ok(response);
    }
}
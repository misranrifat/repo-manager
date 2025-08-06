package com.repomanager.controller;

import com.repomanager.model.Repository;
import com.repomanager.service.GitHubService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/repositories")
@RequiredArgsConstructor
public class RepositoryController {
    
    private final GitHubService gitHubService;
    
    @GetMapping
    public ResponseEntity<List<Repository>> getAllRepositories(
            @RequestParam(required = false) String visibility,
            @RequestParam(required = false) String search) {
        
        log.debug("Fetching repositories with visibility: {} and search: {}", visibility, search);
        List<Repository> repositories = gitHubService.getFilteredRepositories(visibility, search);
        return ResponseEntity.ok(repositories);
    }
    
    @PatchMapping("/{repoId}/visibility")
    public ResponseEntity<Repository> toggleRepositoryVisibility(
            @PathVariable Long repoId,
            @RequestBody Map<String, Boolean> request) {
        
        Boolean makePrivate = request.get("private");
        if (makePrivate == null) {
            return ResponseEntity.badRequest().build();
        }
        
        log.info("Toggling repository {} visibility to {}", repoId, makePrivate ? "private" : "public");
        Repository updatedRepo = gitHubService.toggleRepositoryVisibility(repoId, makePrivate);
        return ResponseEntity.ok(updatedRepo);
    }
}
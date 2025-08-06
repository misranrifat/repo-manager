package com.repomanager.service;

import com.repomanager.exception.GitHubAuthenticationException;
import com.repomanager.model.Repository;
import lombok.extern.slf4j.Slf4j;
import org.kohsuke.github.GHRepository;
import org.kohsuke.github.GitHub;
import org.kohsuke.github.GitHubBuilder;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
public class GitHubService {
    
    private GitHub github;
    private String token;
    
    @PostConstruct
    public void init() {
        token = System.getenv("GITHUB_TOKEN");
        if (token == null || token.trim().isEmpty()) {
            log.error("GitHub Personal Access Token not found in environment variable GITHUB_TOKEN");
            throw new GitHubAuthenticationException(
                "GitHub Personal Access Token not found. Please set the GITHUB_TOKEN environment variable."
            );
        }
        
        try {
            github = new GitHubBuilder().withOAuthToken(token).build();
            github.checkApiUrlValidity();
            log.info("Successfully authenticated with GitHub API");
        } catch (IOException e) {
            log.error("Failed to authenticate with GitHub", e);
            throw new GitHubAuthenticationException("Failed to authenticate with GitHub. Please check your Personal Access Token.", e);
        }
    }
    
    public boolean isAuthenticated() {
        return github != null && token != null;
    }
    
    public String getAuthenticatedUser() {
        try {
            return github.getMyself().getLogin();
        } catch (IOException e) {
            log.error("Failed to get authenticated user", e);
            return null;
        }
    }
    
    public List<Repository> getAllRepositories() {
        try {
            List<Repository> repositories = new ArrayList<>();
            
            for (GHRepository ghRepo : github.getMyself().listRepositories()) {
                repositories.add(mapToRepository(ghRepo));
            }
            
            return repositories;
        } catch (IOException e) {
            log.error("Failed to fetch repositories", e);
            throw new RuntimeException("Failed to fetch repositories from GitHub", e);
        }
    }
    
    public List<Repository> getFilteredRepositories(String visibility, String searchTerm) {
        List<Repository> allRepos = getAllRepositories();
        
        return allRepos.stream()
            .filter(repo -> filterByVisibility(repo, visibility))
            .filter(repo -> filterBySearchTerm(repo, searchTerm))
            .collect(Collectors.toList());
    }
    
    public Repository toggleRepositoryVisibility(Long repoId, boolean makePrivate) {
        try {
            GHRepository ghRepo = github.getRepositoryById(repoId);
            
            if (ghRepo == null) {
                throw new RuntimeException("Repository not found with ID: " + repoId);
            }
            
            ghRepo.setPrivate(makePrivate);
            log.info("Successfully updated repository {} visibility to {}", 
                ghRepo.getName(), makePrivate ? "private" : "public");
            
            return mapToRepository(ghRepo);
        } catch (IOException e) {
            log.error("Failed to toggle repository visibility", e);
            throw new RuntimeException("Failed to update repository visibility", e);
        }
    }
    
    private Repository mapToRepository(GHRepository ghRepo) throws IOException {
        return Repository.builder()
            .id(ghRepo.getId())
            .name(ghRepo.getName())
            .fullName(ghRepo.getFullName())
            .description(ghRepo.getDescription())
            .owner(ghRepo.getOwnerName())
            .htmlUrl(ghRepo.getHtmlUrl().toString())
            .isPrivate(ghRepo.isPrivate())
            .language(ghRepo.getLanguage())
            .stargazersCount(ghRepo.getStargazersCount())
            .forksCount(ghRepo.getForksCount())
            .createdAt(ghRepo.getCreatedAt().toInstant()
                .atZone(ZoneId.systemDefault()).toLocalDateTime())
            .updatedAt(ghRepo.getUpdatedAt().toInstant()
                .atZone(ZoneId.systemDefault()).toLocalDateTime())
            .size((long) ghRepo.getSize())
            .defaultBranch(ghRepo.getDefaultBranch())
            .build();
    }
    
    private boolean filterByVisibility(Repository repo, String visibility) {
        if (visibility == null || visibility.equalsIgnoreCase("all")) {
            return true;
        }
        if (visibility.equalsIgnoreCase("public")) {
            return !repo.isPrivate();
        }
        if (visibility.equalsIgnoreCase("private")) {
            return repo.isPrivate();
        }
        return true;
    }
    
    private boolean filterBySearchTerm(Repository repo, String searchTerm) {
        if (searchTerm == null || searchTerm.trim().isEmpty()) {
            return true;
        }
        
        String term = searchTerm.toLowerCase();
        return repo.getName().toLowerCase().contains(term) ||
               (repo.getDescription() != null && repo.getDescription().toLowerCase().contains(term));
    }
}
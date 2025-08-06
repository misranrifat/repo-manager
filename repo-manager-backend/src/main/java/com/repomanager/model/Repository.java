package com.repomanager.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Repository {
    private Long id;
    private String name;
    private String fullName;
    private String description;
    private String owner;
    private String htmlUrl;
    @JsonProperty("isPrivate")
    private boolean isPrivate;
    private String language;
    private Integer stargazersCount;
    private Integer forksCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Long size;
    private String defaultBranch;
}
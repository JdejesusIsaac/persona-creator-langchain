// lib/templates/claude-command-suite.ts

interface RoleInsights {
    role_title: string;
    seniority_level: string;
    core_responsibilities: string[];
    required_skills: {
      technical: string[];
      soft_skills: string[];
    };
    tools_technologies: string[];
    industry_context: string;
    hiring_signals: string[];
    key_success_metrics: string[];
    collaboration_aspects: string[];
  }
  
  export function generateClaudeCommandSuite(insights: RoleInsights): string {
    const technicalSkills = insights.required_skills.technical.slice(0, 8);
    const softSkills = insights.required_skills.soft_skills.slice(0, 5);
    const topTools = insights.tools_technologies.slice(0, 6);
    const topResponsibilities = insights.core_responsibilities.slice(0, 8);
    const topSignals = insights.hiring_signals.slice(0, 4);
    
    // Generate role-specific command categories
    const commandCategories = generateCommandCategories(insights);
    
    return `# ${insights.role_title} Command Suite
  
  **Professional Context:** ${insights.seniority_level} ${insights.role_title} specializing in ${insights.industry_context}
  
  **Core Expertise:** ${technicalSkills.slice(0, 3).join(', ')}
  
  ---
  
  ## Quick Reference Commands
  
  ${commandCategories.map(cat => `- \`/project:${cat.slug}\` - ${cat.description}`).join('\n')}
  
  ---
  
  ${commandCategories.map(cat => generateCommandFile(cat, insights)).join('\n\n---\n\n')}
  
  ---
  
  ## 🎯 Role Context & Standards
  
  ### Professional Identity
  You are functioning as a ${insights.seniority_level} ${insights.role_title} with deep expertise in ${insights.industry_context}.
  
  ### Core Competencies
  **Technical Skills:** ${technicalSkills.join(', ')}
  
  **Soft Skills:** ${softSkills.join(', ')}
  
  **Tools & Platforms:** ${topTools.join(', ')}
  
  ### What Matters Most in This Role
  ${topSignals.map(s => `- ${s}`).join('\n')}
  
  ### Success Metrics
  ${insights.key_success_metrics.map(m => `- ${m}`).join('\n')}
  
  ---
  
  ## 📋 How to Use This Command Suite
  
  ### Installation
  
  1. **Save this file** to your project:
     \`\`\`bash
     mkdir -p .claude/commands
     # Save each command section as separate .md files
     \`\`\`
  
  2. **Or use as Claude Project Knowledge:**
     - Go to your Claude Project settings
     - Add this entire file to Project Knowledge
     - Commands will be available in all chats within this project
  
  ### Using Commands
  
  **Basic Usage:**
  \`\`\`
  /project:command-name
  \`\`\`
  
  **With Arguments:**
  \`\`\`
  /project:command-name specific topic or focus area
  \`\`\`
  
  **Examples:**
  \`\`\`
  /project:analyze-${insights.role_title.toLowerCase().replace(/\s+/g, '-')}
  /project:review-${topResponsibilities[0].split(' ')[0].toLowerCase()}
  /project:strategy-${insights.industry_context.split(' ')[0].toLowerCase()}
  \`\`\`
  
  ### Best Practices
  
  1. **Provide Context:** Always share relevant background information
  2. **Be Specific:** Use arguments to narrow the focus
  3. **Iterate:** Use multiple commands for complex tasks
  4. **Validate:** Review outputs before implementing
  5. **Adapt:** Customize commands for your specific situation
  
  ---
  
  ## 🔧 Customization Guide
  
  ### Modifying Commands
  
  Each command can be customized by:
  - Adding project-specific context
  - Adjusting quality checkpoints
  - Including team standards
  - Modifying tool preferences
  
  ### Adding New Commands
  
  Create new commands following this structure:
  \`\`\`markdown
  # Command Name
  
  Brief description.
  
  ## Instructions
  
  1. **Step Category**
     - Specific action
     - Quality checkpoint
     
  2. **Next Step**
     - Additional actions
  \`\`\`
  
  ---
  
  ## 📚 Additional Resources
  
  **For ${insights.role_title}s:**
  - Reference the ${topTools[0]} documentation when needed
  - Follow ${insights.industry_context} best practices
  - Apply ${insights.seniority_level}-level thinking and judgment
  - Consider ${insights.collaboration_aspects[0] || 'cross-functional collaboration'}
  
  **Tool-Specific Guidance:**
  ${topTools.slice(0, 3).map(tool => `- **${tool}**: Use for ${getRoleSpecificToolUsage(tool, insights.role_title)}`).join('\n')}
  
  ---
  
  *Command Suite Generated: ${new Date().toISOString()}*
  *Role: ${insights.role_title} | Context: ${insights.industry_context}*
  `;
  }
  
  // Helper: Generate command categories based on role
  function generateCommandCategories(insights: RoleInsights): CommandCategory[] {
    const categories: CommandCategory[] = [];
    
    // Analysis/Review commands
    categories.push({
      slug: `analyze-${insights.role_title.toLowerCase().replace(/\s+/g, '-')}`,
      name: `Analyze ${insights.core_responsibilities[0]?.split(' ')[0] || 'Work'}`,
      description: `Deep analysis from a ${insights.role_title} perspective`,
      type: 'analysis'
    });
    
    // Strategy/Planning commands
    categories.push({
      slug: 'strategic-planning',
      name: 'Strategic Planning',
      description: `Develop strategy for ${insights.industry_context} initiatives`,
      type: 'strategy'
    });
    
    // Review/Audit commands
    categories.push({
      slug: 'professional-review',
      name: 'Professional Review',
      description: `Review work using ${insights.role_title} expertise`,
      type: 'review'
    });
    
    // Communication commands
    categories.push({
      slug: 'draft-communication',
      name: 'Draft Communication',
      description: `Create professional communications for ${insights.role_title} context`,
      type: 'communication'
    });
    
    // Decision-making commands
    categories.push({
      slug: 'decision-framework',
      name: 'Decision Framework',
      description: `Apply ${insights.seniority_level}-level decision-making`,
      type: 'decision'
    });
    
    // Problem-solving commands
    categories.push({
      slug: 'solve-challenge',
      name: 'Solve Challenge',
      description: `Address common ${insights.role_title} challenges`,
      type: 'problem-solving'
    });
    
    // Tool-specific commands (if relevant tools identified)
    if (insights.tools_technologies.length > 0) {
      categories.push({
        slug: 'tool-guidance',
        name: `${insights.tools_technologies[0]} Guidance`,
        description: `Best practices for ${insights.tools_technologies[0]} usage`,
        type: 'tool'
      });
    }
    
    // Collaboration commands
    if (insights.collaboration_aspects.length > 0) {
      categories.push({
        slug: 'collaboration-guidance',
        name: 'Collaboration Guidance',
        description: `Navigate ${insights.collaboration_aspects[0]}`,
        type: 'collaboration'
      });
    }
    
    return categories;
  }
  
  interface CommandCategory {
    slug: string;
    name: string;
    description: string;
    type: string;
  }
  
  // Helper: Generate full command markdown
  function generateCommandFile(category: CommandCategory, insights: RoleInsights): string {
    const templates: Record<string, (insights: RoleInsights) => string> = {
      analysis: generateAnalysisCommand,
      strategy: generateStrategyCommand,
      review: generateReviewCommand,
      communication: generateCommunicationCommand,
      decision: generateDecisionCommand,
      'problem-solving': generateProblemSolvingCommand,
      tool: generateToolCommand,
      collaboration: generateCollaborationCommand,
    };
    
    const generator = templates[category.type] || generateGenericCommand;
    return generator(insights);
  }
  
  function generateAnalysisCommand(insights: RoleInsights): string {
    return `# Analyze from ${insights.role_title} Perspective
  
  Perform deep analysis using ${insights.role_title} expertise and ${insights.industry_context} context.
  
  ## Instructions
  
  1. **Context Understanding**
     - Review the topic/problem through ${insights.role_title} lens
     - Consider ${insights.industry_context} specific factors
     - Identify relevant ${insights.tools_technologies[0] || 'tools'} and methodologies
     - **Quality Gate:** Confirm full understanding before proceeding
  
  2. **${insights.role_title} Analysis**
     - Apply ${insights.required_skills.technical[0] || 'domain expertise'} to evaluate situation
     - Consider impact on ${insights.key_success_metrics[0] || 'key metrics'}
     - Identify risks, opportunities, and constraints
     - Reference ${insights.seniority_level}-level strategic considerations
     - **Quality Gate:** Analysis covers all critical dimensions
  
  3. **Insights & Recommendations**
     - Synthesize findings into actionable insights
     - Provide concrete recommendations with rationale
     - Prioritize by impact and feasibility
     - Include implementation considerations
     - **Quality Gate:** Recommendations are specific and actionable
  
  4. **Next Steps**
     - Outline immediate actions required
     - Identify stakeholders to involve (${insights.collaboration_aspects[0] || 'relevant teams'})
     - Suggest success metrics to track
     - Flag any dependencies or blockers
  
  ## Output Format
  
  \`\`\`
  ## Analysis Summary
  [Executive summary of key findings]
  
  ## Detailed Assessment
  [Comprehensive analysis with supporting evidence]
  
  ## Recommendations
  1. [Priority 1 recommendation with rationale]
  2. [Priority 2 recommendation with rationale]
  3. [Priority 3 recommendation with rationale]
  
  ## Implementation Plan
  - Immediate: [Quick wins]
  - Short-term: [1-4 weeks]
  - Long-term: [Strategic initiatives]
  
  ## Success Metrics
  [How to measure impact]
  \`\`\``;
  }
  
  function generateStrategyCommand(insights: RoleInsights): string {
    return `# Strategic Planning for ${insights.role_title}
  
  Develop comprehensive strategy for $ARGUMENTS considering ${insights.industry_context} context.
  
  ## Instructions
  
  1. **Strategic Context Setting**
     - Define strategic objective for $ARGUMENTS
     - Review ${insights.industry_context} market dynamics
     - Assess current state and desired end state
     - Identify key stakeholders: ${insights.collaboration_aspects.slice(0, 2).join(', ') || 'relevant parties'}
     - **Quality Gate:** Clear strategic objective defined
  
  2. **Situation Analysis**
     - Conduct SWOT analysis specific to $ARGUMENTS
     - Evaluate competitive landscape (if applicable)
     - Assess available resources and constraints
     - Consider ${insights.required_skills.technical[0] || 'technical'} implications
     - **Quality Gate:** Comprehensive situational awareness
  
  3. **Strategy Formulation**
     - Define strategic options (minimum 3 alternatives)
     - Evaluate each option against ${insights.key_success_metrics[0] || 'success criteria'}
     - Recommend optimal approach with justification
     - Outline ${insights.seniority_level}-level considerations
     - **Quality Gate:** Strategy aligns with ${insights.hiring_signals[0] || 'professional standards'}
  
  4. **Roadmap Development**
     - Break strategy into phases with milestones
     - Assign ownership and accountability
     - Identify required ${insights.tools_technologies[0] || 'resources'}
     - Plan risk mitigation strategies
     - **Quality Gate:** Roadmap is realistic and achievable
  
  5. **Communication Plan**
     - Draft strategy presentation for leadership
     - Prepare team communication
     - Plan stakeholder engagement approach
     - Define progress reporting cadence
  
  ## Output Format
  
  \`\`\`
  ## Strategic Objective
  [Clear statement of what we're trying to achieve]
  
  ## Situation Analysis
  - Strengths: [Internal capabilities]
  - Weaknesses: [Gaps to address]
  - Opportunities: [External factors to leverage]
  - Threats: [Risks to mitigate]
  
  ## Recommended Strategy
  [Detailed strategy description with rationale]
  
  ## Implementation Roadmap
  Phase 1 (Immediate): [Actions]
  Phase 2 (Short-term): [Actions]
  Phase 3 (Long-term): [Actions]
  
  ## Resource Requirements
  - Team: [People needed]
  - Tools: [${insights.tools_technologies.slice(0, 3).join(', ')}]
  - Budget: [Estimates]
  
  ## Success Metrics
  [How we'll measure progress and success]
  
  ## Risk Management
  [Key risks and mitigation strategies]
  \`\`\``;
  }
  
  function generateReviewCommand(insights: RoleInsights): string {
    return `# Professional Review as ${insights.role_title}
  
  Conduct comprehensive review of $ARGUMENTS using ${insights.role_title} expertise.
  
  ## Instructions
  
  1. **Review Preparation**
     - Understand the context and purpose of $ARGUMENTS
     - Review against ${insights.industry_context} standards
     - Identify key evaluation criteria for ${insights.role_title}
     - **Quality Gate:** Clear review objectives established
  
  2. **Technical Assessment**
     - Evaluate ${insights.required_skills.technical[0] || 'technical quality'}
     - Check alignment with ${insights.tools_technologies[0] || 'best practices'}
     - Assess completeness and accuracy
     - Identify technical debt or shortcuts
     - **Quality Gate:** Technical aspects thoroughly examined
  
  3. **Professional Standards Review**
     - Verify compliance with ${insights.industry_context} standards
     - Check against ${insights.hiring_signals[0] || 'industry best practices'}
     - Assess ${insights.seniority_level}-level considerations
     - Review for ${insights.required_skills.soft_skills[0] || 'quality'}
     - **Quality Gate:** Meets professional standards
  
  4. **Impact Analysis**
     - Evaluate impact on ${insights.key_success_metrics[0] || 'key objectives'}
     - Consider stakeholder implications
     - Assess risks and dependencies
     - Review ${insights.collaboration_aspects[0] || 'cross-functional impacts'}
     - **Quality Gate:** Full impact understood
  
  5. **Recommendations**
     - Highlight strengths and successes
     - Identify specific improvements needed
     - Prioritize changes by impact
     - Provide actionable feedback
     - **Quality Gate:** Feedback is constructive and specific
  
  ## Output Format
  
  \`\`\`
  ## Review Summary
  Overall Assessment: [Excellent/Good/Needs Work]
  Key Strengths: [Top 3]
  Priority Improvements: [Top 3]
  
  ## Detailed Findings
  
  ### Strengths ✅
  1. [Specific positive finding]
  2. [Specific positive finding]
  
  ### Areas for Improvement 🔧
  1. [Specific issue with recommended fix]
  2. [Specific issue with recommended fix]
  
  ### Critical Issues ⚠️
  [Any blocking or high-priority concerns]
  
  ## Recommendations
  
  **Immediate Actions:**
  - [Must-do item 1]
  - [Must-do item 2]
  
  **Short-term Improvements:**
  - [Nice-to-have improvement 1]
  - [Nice-to-have improvement 2]
  
  **Long-term Considerations:**
  - [Strategic enhancement 1]
  
  ## Professional Standards Compliance
  [Assessment against ${insights.industry_context} standards]
  \`\`\``;
  }
  
  function generateCommunicationCommand(insights: RoleInsights): string {
    return `# Draft Professional Communication
  
  Create ${insights.role_title}-appropriate communication for $ARGUMENTS.
  
  ## Instructions
  
  1. **Communication Planning**
     - Define purpose and audience of $ARGUMENTS
     - Determine appropriate tone for ${insights.seniority_level} ${insights.role_title}
     - Identify key messages to convey
     - Consider ${insights.collaboration_aspects[0] || 'stakeholder needs'}
     - **Quality Gate:** Clear communication objective
  
  2. **Content Development**
     - Structure message logically
     - Use ${insights.industry_context} terminology appropriately
     - Include relevant ${insights.required_skills.technical[0] || 'context'}
     - Balance detail with clarity
     - **Quality Gate:** Message is clear and complete
  
  3. **Professional Refinement**
     - Apply ${insights.required_skills.soft_skills[0] || 'professional'} communication style
     - Ensure tone matches ${insights.seniority_level} level
     - Add appropriate calls-to-action
     - Include relevant ${insights.tools_technologies[0] || 'references'}
     - **Quality Gate:** Communication is professional and polished
  
  4. **Review & Validation**
     - Check for clarity and conciseness
     - Verify accuracy of technical details
     - Ensure alignment with ${insights.hiring_signals[0] || 'professional standards'}
     - Validate appropriate for intended audience
     - **Quality Gate:** Ready to send
  
  ## Output Format
  
  \`\`\`
  ## Communication Draft
  
  [Professional communication content]
  
  ---
  
  ## Communication Details
  - **Type:** [Email/Report/Presentation/Documentation]
  - **Audience:** [Specific audience]
  - **Purpose:** [Clear purpose]
  - **Tone:** [Professional/${insights.seniority_level}-appropriate]
  
  ## Key Messages
  1. [Primary message]
  2. [Secondary message]
  3. [Tertiary message]
  
  ## Suggested Subject Line (if email)
  [Compelling subject line]
  
  ## Follow-up Actions
  [What happens after sending this]
  \`\`\``;
  }
  
  function generateDecisionCommand(insights: RoleInsights): string {
    return `# Decision Framework for ${insights.role_title}
  
  Apply structured decision-making to $ARGUMENTS using ${insights.seniority_level}-level judgment.
  
  ## Instructions
  
  1. **Decision Framing**
     - Clearly define the decision to be made about $ARGUMENTS
     - Identify why this decision matters for ${insights.role_title}
     - Define success criteria for the decision
     - Set decision timeline and constraints
     - **Quality Gate:** Decision clearly scoped
  
  2. **Options Generation**
     - Brainstorm at least 3 viable options
     - Consider ${insights.industry_context} best practices
     - Include both conventional and innovative approaches
     - Account for ${insights.tools_technologies[0] || 'available resources'}
     - **Quality Gate:** Comprehensive option set
  
  3. **Multi-Criteria Analysis**
     - Evaluate against ${insights.key_success_metrics[0] || 'key metrics'}
     - Assess ${insights.required_skills.technical[0] || 'technical'} feasibility
     - Consider ${insights.collaboration_aspects[0] || 'stakeholder'} impact
     - Analyze risks and mitigation strategies
     - Apply ${insights.seniority_level} ${insights.role_title} judgment
     - **Quality Gate:** Thorough evaluation completed
  
  4. **Recommendation Development**
     - Identify optimal choice with clear rationale
     - Document key assumptions
     - Outline implementation approach
     - Define success metrics
     - **Quality Gate:** Defensible recommendation
  
  5. **Stakeholder Communication**
     - Prepare decision brief for leadership
     - Anticipate questions and objections
     - Plan change management (if needed)
     - Define monitoring and adjustment triggers
  
  ## Output Format
  
  \`\`\`
  ## Decision Statement
  [What needs to be decided]
  
  ## Options Analysis
  
  ### Option 1: [Name]
  **Pros:**
  - [Advantage 1]
  - [Advantage 2]
  
  **Cons:**
  - [Disadvantage 1]
  - [Disadvantage 2]
  
  **Risk Level:** [Low/Medium/High]
  **Estimated Impact:** [Description]
  
  ### Option 2: [Name]
  [Similar structure]
  
  ### Option 3: [Name]
  [Similar structure]
  
  ## Recommendation
  **Selected Option:** [Option name]
  
  **Rationale:**
  [Detailed explanation of why this is the best choice]
  
  **Key Assumptions:**
  - [Assumption 1]
  - [Assumption 2]
  
  **Implementation Plan:**
  1. [Step 1]
  2. [Step 2]
  3. [Step 3]
  
  **Success Metrics:**
  - [How we'll measure success]
  
  **Risk Mitigation:**
  - [Top risk + mitigation plan]
  
  ## Decision Timeline
  - Decision date: [When]
  - Implementation start: [When]
  - First review: [When]
  \`\`\``;
  }
  
  function generateProblemSolvingCommand(insights: RoleInsights): string {
    return `# Solve ${insights.role_title} Challenge
  
  Address $ARGUMENTS using ${insights.role_title} problem-solving approach.
  
  ## Instructions
  
  1. **Problem Definition**
     - Clearly articulate the challenge in $ARGUMENTS
     - Identify root causes vs. symptoms
     - Understand impact on ${insights.key_success_metrics[0] || 'objectives'}
     - Define what "solved" looks like
     - **Quality Gate:** Problem fully understood
  
  2. **Context Analysis**
     - Review ${insights.industry_context} relevant factors
     - Identify constraints (time, budget, resources)
     - Map stakeholders: ${insights.collaboration_aspects.slice(0, 2).join(', ') || 'affected parties'}
     - Assess ${insights.tools_technologies[0] || 'available tools'} and capabilities
     - **Quality Gate:** Complete situational awareness
  
  3. **Solution Development**
     - Generate multiple solution approaches (minimum 3)
     - Apply ${insights.required_skills.technical[0] || 'technical'} expertise
     - Consider ${insights.seniority_level}-level strategic implications
     - Leverage ${insights.required_skills.soft_skills[0] || 'problem-solving'} skills
     - **Quality Gate:** Viable solutions identified
  
  4. **Solution Evaluation**
     - Assess feasibility and impact of each solution
     - Evaluate risks and dependencies
     - Consider implementation complexity
     - Select optimal approach
     - **Quality Gate:** Best solution identified with justification
  
  5. **Implementation Planning**
     - Create step-by-step action plan
     - Assign responsibilities
     - Define milestones and checkpoints
     - Plan communication strategy
     - Set success metrics
     - **Quality Gate:** Clear path to resolution
  
  ## Output Format
  
  \`\`\`
  ## Problem Statement
  [Clear description of the challenge]
  
  **Impact:** [Why this matters]
  **Constraints:** [Limitations to work within]
  
  ## Root Cause Analysis
  [Underlying causes, not just symptoms]
  
  ## Proposed Solutions
  
  ### Solution 1: [Name]
  - **Approach:** [Description]
  - **Pros:** [Benefits]
  - **Cons:** [Drawbacks]
  - **Effort:** [Low/Medium/High]
  - **Impact:** [Low/Medium/High]
  
  ### Solution 2: [Name]
  [Similar structure]
  
  ## Recommended Approach
  **Selected Solution:** [Solution name]
  
  **Why This Solution:**
  [Clear rationale]
  
  ## Implementation Plan
  
  **Phase 1: [Timeframe]**
  - [Action item 1]
  - [Action item 2]
  
  **Phase 2: [Timeframe]**
  - [Action item 3]
  - [Action item 4]
  
  ## Success Criteria
  - [Metric 1]
  - [Metric 2]
  
  ## Risk Management
  - **Risk:** [Potential issue]
    **Mitigation:** [How to address]
  
  ## Resources Needed
  - [Resource 1: ${insights.tools_technologies[0] || 'Tools'}]
  - [Resource 2: People/budget]
  \`\`\``;
  }
  
  function generateToolCommand(insights: RoleInsights): string {
    const primaryTool = insights.tools_technologies[0] || 'primary tool';
    
    return `# ${primaryTool} Best Practices for ${insights.role_title}
  
  Provide guidance on using ${primaryTool} effectively for $ARGUMENTS.
  
  ## Instructions
  
  1. **Tool Context Assessment**
     - Understand the specific ${primaryTool} task in $ARGUMENTS
     - Review current ${primaryTool} setup and configuration
     - Identify ${insights.role_title}-specific requirements
     - Consider ${insights.industry_context} best practices
     - **Quality Gate:** Clear tool usage objective
  
  2. **Best Practices Application**
     - Apply ${insights.seniority_level}-level ${primaryTool} expertise
     - Reference ${insights.industry_context} standards
     - Consider scalability and maintainability
     - Optimize for ${insights.key_success_metrics[0] || 'efficiency'}
     - **Quality Gate:** Following established patterns
  
  3. **${insights.role_title}-Specific Workflow**
     - Outline step-by-step ${primaryTool} workflow
     - Include ${insights.required_skills.technical[0] || 'technical'} considerations
     - Add quality checkpoints throughout
     - Integrate with other ${insights.tools_technologies.slice(1, 3).join(' and ') || 'tools'}
     - **Quality Gate:** Workflow is complete and efficient
  
  4. **Common Pitfalls & Solutions**
     - Identify typical ${primaryTool} mistakes
     - Provide troubleshooting guidance
     - Share time-saving tips and shortcuts
     - Document edge cases to watch for
     - **Quality Gate:** Potential issues addressed
  
  5. **Validation & Quality Assurance**
     - Define how to verify ${primaryTool} output
     - Set quality standards for ${insights.role_title}
     - Include testing or review steps
     - Document success criteria
     - **Quality Gate:** Quality measures in place
  
  ## Output Format
  
  \`\`\`
  ## ${primaryTool} Guidance for: $ARGUMENTS
  
  ### Quick Start
  [Essential steps to get started]
  
  ### Detailed Workflow
  
  **Step 1: [Phase name]**
  - Action: [What to do]
  - Tool: [${primaryTool} features to use]
  - Checkpoint: [How to verify]
  
  **Step 2: [Phase name]**
  [Similar structure]
  
  ### Best Practices
  - ✅ [Do this]
  - ✅ [Do this]
  - ❌ [Avoid this]
  - ❌ [Avoid this]
  
  ### Common Issues & Solutions
  
  **Issue:** [Problem]
  **Solution:** [Fix]
  **Prevention:** [How to avoid]
  
  ### Integration Points
  - [How this connects to ${insights.tools_technologies[1] || 'other tools'}]
  - [Workflow considerations for ${insights.role_title}]
  
  ### Quality Checklist
  - [ ] [Validation point 1]
  - [ ] [Validation point 2]
  - [ ] [Validation point 3]
  
  ### Additional Resources
  - [${primaryTool} documentation links]
  - [${insights.industry_context} specific guides]
  \`\`\``;
  }
  
  function generateCollaborationCommand(insights: RoleInsights): string {
    const primaryCollaboration = insights.collaboration_aspects[0] || 'cross-functional collaboration';
    
    return `# Collaboration Guidance: ${primaryCollaboration}
  
  Navigate ${primaryCollaboration} for $ARGUMENTS as a ${insights.role_title}.
  
  ## Instructions
  
  1. **Stakeholder Mapping**
     - Identify all parties involved in $ARGUMENTS
     - Understand each stakeholder's interests and concerns
     - Map ${primaryCollaboration} dynamics
     - Consider ${insights.industry_context} organizational context
     - **Quality Gate:** Complete stakeholder picture
  
  2. **Communication Strategy**
     - Determine appropriate communication channels
     - Plan message framing for different audiences
     - Apply ${insights.required_skills.soft_skills[0] || 'communication'} best practices
     - Consider ${insights.seniority_level}-level expectations
     - **Quality Gate:** Clear communication plan
  
  3. **Coordination Planning**
     - Define roles and responsibilities
     - Establish decision-making processes
     - Set up collaboration workflows using ${insights.tools_technologies[0] || 'appropriate tools'}
     - Plan regular sync points
     - **Quality Gate:** Coordination structure in place
  
  4. **Relationship Management**
     - Build trust and credibility as ${insights.role_title}
     - Address potential conflicts proactively
     - Leverage ${insights.required_skills.soft_skills.slice(0, 2).join(' and ') || 'interpersonal skills'}
     - Foster psychological safety
     - **Quality Gate:** Positive working relationships
  
  5. **Execution & Follow-through**
     - Implement collaboration plan for $ARGUMENTS
     - Monitor progress and engagement
     - Adjust approach based on feedback
     - Ensure accountability and follow-through
     - **Quality Gate:** Effective collaboration achieved
  
  ## Output Format
  
  \`\`\`
  ## Collaboration Plan for: $ARGUMENTS
  
  ### Stakeholder Analysis
  
  **Primary Stakeholders:**
  - [Name/Role]: [Interest, Influence, Communication needs]
  - [Name/Role]: [Interest, Influence, Communication needs]
  
  **Secondary Stakeholders:**
  - [Name/Role]: [Interest, Influence, Communication needs]
  
  ### Communication Matrix
  
  | Stakeholder | Message | Channel | Frequency | Owner |
  |------------|---------|---------|-----------|-------|
  | [Name]     | [What]  | [How]   | [When]    | [Who] |
  
  ### Collaboration Workflow
  
  **Phase 1: [Name]**
  - Activities: [What happens]
  - Participants: [Who's involved]
  - Tools: [${insights.tools_technologies[0] || 'Tools used'}]
  - Deliverable: [Output]
  
  **Phase 2: [Name]**
  [Similar structure]
  
  ### Decision Framework
  - **Decision Type:** [Category]
  - **Decision Maker:** [Role]
  - **Input Required:** [From whom]
  - **Timeline:** [When]
  
  ### Potential Challenges
  
  **Challenge:** [Issue]
  **Impact:** [Risk level]
  **Mitigation:** [Prevention strategy]
  
  ### Success Metrics
  - [How to measure effective collaboration]
  - [Indicators of healthy ${primaryCollaboration}]
  
  ### Meeting Cadence
  - [Regular sync type]: [Frequency]
  - [Review type]: [Frequency]
  \`\`\``;
  }
  
  function generateGenericCommand(insights: RoleInsights): string {
    return `# ${insights.role_title} Assistance
  
  Provide ${insights.role_title} expertise for $ARGUMENTS.
  
  ## Instructions
  
  1. **Understand Request**
     - Clarify the specific need in $ARGUMENTS
     - Apply ${insights.role_title} context
     - Consider ${insights.industry_context} factors
     - **Quality Gate:** Clear understanding achieved
  
  2. **Apply Expertise**
     - Use ${insights.required_skills.technical[0] || 'professional'} knowledge
     - Consider ${insights.seniority_level}-level implications
     - Reference relevant best practices
     - **Quality Gate:** Expert guidance provided
  
  3. **Deliver Value**
     - Provide actionable recommendations
     - Include concrete examples
     - Address potential challenges
     - **Quality Gate:** Valuable output created
  
  ## Output Format
  
  \`\`\`
  ## Response
  
  [Professional guidance based on ${insights.role_title} expertise]
  
  ## Recommendations
  1. [Specific recommendation]
  2. [Specific recommendation]
  
  ## Next Steps
  - [Action item]
  \`\`\``;
  }
  
  function getRoleSpecificToolUsage(tool: string, roleTitle: string): string {
    // This could be enhanced with a mapping or AI generation
    return `${roleTitle}-specific workflows`;
  }
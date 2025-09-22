// app.js - FIXED Multi-position voting system
const supabaseUrl = 'https://iaenttkokcxtiauzjtgw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhZW50dGtva2N4dGlhdXpqdGd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4NDQ2NDksImV4cCI6MjA3MzQyMDY0OX0.u6ZBX-d_CTNlA94OM7h2JerNpmhuHZxYSXmj0OxRhRI';
const supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);

// Global variables
window.selectedCandidates = {};
window.currentVoterId = null;
window.hasVotedOnThisDevice = localStorage.getItem('hasVotedOnThisDevice') === 'true';

// Enhanced voter login
async function handleVoterLogin() {
    const voterNameInput = document.getElementById('voterName');
    const voterName = voterNameInput.value.trim();
    const loginMessage = document.getElementById('loginMessage');

    if (!voterName) {
        loginMessage.textContent = "Please enter your name.";
        loginMessage.className = "message error";
        return;
    }

    // Check if already voted on this device
    if (window.hasVotedOnThisDevice) {
        showAlreadyVotedNotification();
        return;
    }

    loginMessage.textContent = "Checking...";
    loginMessage.className = "message info";

    const { data: voter, error } = await supabase
        .from('voters')
        .select('*')
        .ilike('name', voterName)
        .maybeSingle();

    if (error) {
        loginMessage.textContent = "Error: " + error.message;
        loginMessage.className = "message error";
        console.error(error);
    } else if (voter) {
        if (voter.has_voted) {
            showAlreadyVotedNotification();
            return;
        }
        
        loginMessage.textContent = "Login successful!";
        loginMessage.className = "message success";

        setTimeout(() => {
            document.getElementById('loginSection').classList.remove('active');
            document.getElementById('voterDetailsSection').classList.add('active');

            // Display voter details
            document.getElementById('displayName').textContent = voter.name;
            document.getElementById('displayUniversity').textContent = voter.university || 'N/A';
            document.getElementById('displayQualification').textContent = voter.qualification || 'N/A';
            document.getElementById('displaySex').textContent = voter.sex || 'N/A';
            document.getElementById('displayNationality').textContent = voter.nationality || 'N/A';
            document.getElementById('displayCompletionYear').textContent = voter.completion_year || 'N/A';
            document.getElementById('displayInternshipCenter').textContent = voter.internship_center || 'N/A';

            window.currentVoterId = voter.id;
            window.currentVoterHasVoted = voter.has_voted;

            // Update progress
            updateProgress(2, 'Step 2 of 4: Verify Identity');
        }, 1000);
    } else {
        loginMessage.textContent = "Voter not found. Please check your name and try again.";
        loginMessage.className = "message error";
    }
}

// Show already voted notification
function showAlreadyVotedNotification() {
    const loginMessage = document.getElementById('loginMessage');
    loginMessage.textContent = "You have already voted. Redirecting to results...";
    loginMessage.className = "message error";
    
    setTimeout(() => {
        window.location.href = 'results-1.html';
    }, 2000);
}

// Handle license upload
function handleLicenseUpload() {
    const uploadMessage = document.getElementById('uploadMessage');
    const fileInput = document.getElementById('licenseUpload');
    
    if (!fileInput.files || fileInput.files.length === 0) {
        uploadMessage.textContent = "Please select a license file to upload.";
        uploadMessage.className = "message error";
        return;
    }
    
    uploadMessage.textContent = "License uploaded successfully!";
    uploadMessage.className = "message success";
    
    setTimeout(() => {
        document.getElementById('voterDetailsSection').classList.remove('active');
        document.getElementById('votingSection').classList.add('active');
        loadCandidates();
        updateProgress(3, 'Step 3 of 4: Cast Your Votes');
    }, 1500);
}

// Load candidates for multiple positions - FIXED
async function loadCandidates() {
    try {
        // First get all positions
        const { data: positions, error: positionsError } = await supabase
            .from('positions')
            .select('*')
            .order('title');

        if (positionsError) {
            console.error("Error loading positions:", positionsError);
            document.getElementById('positionsContainer').innerHTML = '<p>Error loading positions</p>';
            return;
        }

        const candidatesContainer = document.getElementById('positionsContainer');
        candidatesContainer.innerHTML = '';

        // For each position, load its candidates
        for (const position of positions) {
            const { data: candidates, error: candidatesError } = await supabase
                .from('candidates')
                .select('*')
                .eq('position_id', position.id)
                .order('name');

            if (candidatesError) {
                console.error(`Error loading candidates for ${position.title}:`, candidatesError);
                continue;
            }

            const positionDiv = document.createElement('div');
            positionDiv.className = 'position-section pending';
            positionDiv.id = `position-${position.id}`;
            
            let candidatesHTML = '';
            if (candidates && candidates.length > 0) {
                candidates.forEach(candidate => {
                    candidatesHTML += `
                        <div class="candidate" onclick="selectCandidate('${position.id}', '${candidate.id}', this)">
                            <h3>${candidate.name}</h3>
                            <p>${candidate.description || 'No description available'}</p>
                            <button>SELECT</button>
                        </div>
                    `;
                });
            } else {
                candidatesHTML = '<p>No candidates available for this position</p>';
            }
            
            positionDiv.innerHTML = `
                <div class="position-title">
                    <span>${position.title}</span>
                    <span class="position-status">Not Voted</span>
                </div>
                <div class="candidates-container">
                    ${candidatesHTML}
                </div>
                <button class="skip-btn" onclick="skipPosition('${position.id}')">Skip This Position</button>
            `;
            
            candidatesContainer.appendChild(positionDiv);
            
            // Initialize this position in selectedCandidates
            window.selectedCandidates[position.id] = null;
        }
        
        updateCompletionStatus();
        
    } catch (error) {
        console.error("Error loading candidates:", error);
        document.getElementById('positionsContainer').innerHTML = '<p>Error loading candidates</p>';
    }
}

// Select candidate - FIXED
function selectCandidate(positionId, candidateId, element) {
    // Deselect any previously selected candidate in this position
    const positionDiv = document.getElementById(`position-${positionId}`);
    const candidates = positionDiv.querySelectorAll('.candidate');
    candidates.forEach(candidate => {
        candidate.classList.remove('selected');
        const btn = candidate.querySelector('button');
        if (btn) {
            btn.textContent = 'SELECT';
            btn.classList.remove('voted');
        }
    });
    
    // Select the new candidate
    if (element) {
        const button = element.querySelector('button');
        button.textContent = 'SELECTED ✓';
        button.classList.add('voted');
        element.classList.add('selected');
    }
    
    // Store the selection
    window.selectedCandidates[positionId] = candidateId;
    
    // Update completion status
    updateCompletionStatus();
}

// Skip position
function skipPosition(positionId) {
    window.selectedCandidates[positionId] = 'skipped';
    
    const positionDiv = document.getElementById(`position-${positionId}`);
    if (positionDiv) {
        const candidates = positionDiv.querySelectorAll('.candidate');
        candidates.forEach(candidate => {
            candidate.classList.remove('selected');
            const btn = candidate.querySelector('button');
            if (btn) {
                btn.textContent = 'SELECT';
                btn.classList.remove('voted');
            }
        });
    }
    
    updateCompletionStatus();
}

// Update completion status
function updateCompletionStatus() {
    const totalPositions = Object.keys(window.selectedCandidates).length;
    const votedPositions = Object.values(window.selectedCandidates).filter(
        candidateId => candidateId && candidateId !== 'skipped'
    ).length;
    
    const completionAlert = document.getElementById('completionAlert');
    const completionText = document.getElementById('completionText');
    const reviewButton = document.getElementById('reviewButton');
    
    if (completionText) {
        completionText.textContent = `You have voted for ${votedPositions} of ${totalPositions} positions`;
    }
    
    if (reviewButton) {
        reviewButton.disabled = votedPositions === 0;
        reviewButton.textContent = votedPositions > 0 ? 
            `Review Votes (${votedPositions}/${totalPositions})` : 
            'Review Votes';
    }
    
    // Update position status indicators
    for (const [positionId, candidateId] of Object.entries(window.selectedCandidates)) {
        const positionDiv = document.getElementById(`position-${positionId}`);
        if (positionDiv) {
            const statusElement = positionDiv.querySelector('.position-status');
            if (statusElement) {
                if (candidateId && candidateId !== 'skipped') {
                    positionDiv.className = 'position-section voted';
                    statusElement.textContent = 'Voted';
                } else if (candidateId === 'skipped') {
                    positionDiv.className = 'position-section skipped';
                    statusElement.textContent = 'Skipped';
                } else {
                    positionDiv.className = 'position-section pending';
                    statusElement.textContent = 'Not Voted';
                }
            }
        }
    }
}

// Review votes
function reviewVotes() {
    const reviewContainer = document.getElementById('reviewContainer');
    if (!reviewContainer) return;
    
    let reviewHTML = '<h3>Your Votes</h3>';
    
    for (const [positionId, candidateId] of Object.entries(window.selectedCandidates)) {
        const positionDiv = document.getElementById(`position-${positionId}`);
        if (positionDiv) {
            const positionTitle = positionDiv.querySelector('.position-title span').textContent;
            
            if (candidateId && candidateId !== 'skipped') {
                const candidateDiv = positionDiv.querySelector(`.candidate[onclick*="${candidateId}"]`);
                if (candidateDiv) {
                    const candidateName = candidateDiv.querySelector('h3').textContent;
                    reviewHTML += `
                        <div class="review-item">
                            <span class="review-position">${positionTitle}</span>
                            <span class="review-candidate">${candidateName}</span>
                            <span class="change-vote" onclick="changeVoteForPosition('${positionId}')">Change</span>
                        </div>
                    `;
                }
            } else if (candidateId === 'skipped') {
                reviewHTML += `
                    <div class="review-item">
                        <span class="review-position">${positionTitle}</span>
                        <span class="review-skipped">Skipped</span>
                        <span class="change-vote" onclick="changeVoteForPosition('${positionId}')">Change</span>
                    </div>
                `;
            } else {
                reviewHTML += `
                    <div class="review-item">
                        <span class="review-position">${positionTitle}</span>
                        <span class="review-skipped">Not voted yet</span>
                        <span class="change-vote" onclick="changeVoteForPosition('${positionId}')">Change</span>
                    </div>
                `;
            }
        }
    }
    
    reviewContainer.innerHTML = reviewHTML;
    
    // Switch to review section
    document.getElementById('votingSection').classList.remove('active');
    document.getElementById('reviewSection').classList.add('active');
    updateProgress(4, 'Step 4 of 4: Review and Submit');
}

// Change vote for position
function changeVoteForPosition(positionId) {
    window.selectedCandidates[positionId] = null;
    
    const positionDiv = document.getElementById(`position-${positionId}`);
    if (positionDiv) {
        positionDiv.className = 'position-section pending';
        const statusElement = positionDiv.querySelector('.position-status');
        if (statusElement) {
            statusElement.textContent = 'Not Voted';
        }
        
        const candidates = positionDiv.querySelectorAll('.candidate');
        candidates.forEach(candidate => {
            candidate.classList.remove('selected');
            const btn = candidate.querySelector('button');
            if (btn) {
                btn.textContent = 'SELECT';
                btn.classList.remove('voted');
            }
        });
    }
    
    updateCompletionStatus();
    goBackToVoting();
    
    setTimeout(() => {
        positionDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
}

// Go back to voting
function goBackToVoting() {
    document.getElementById('reviewSection').classList.remove('active');
    document.getElementById('votingSection').classList.add('active');
    updateProgress(3, 'Step 3 of 4: Cast Your Votes');
}

// Cast votes - FIXED multi-position voting
async function castVotes() {
    const votingMessage = document.getElementById('votingMessage');
    votingMessage.textContent = "Submitting your votes...";
    votingMessage.className = "message info";
    
    if (window.currentVoterHasVoted) {
        votingMessage.textContent = "You have already voted. You cannot vote again.";
        votingMessage.className = "message error";
        return;
    }
    
    if (window.hasVotedOnThisDevice) {
        votingMessage.textContent = "This device has already been used to vote.";
        votingMessage.className = "message error";
        return;
    }
    
    document.getElementById('submitVoteButton').disabled = true;
    
    let hasErrors = false;
    let votesCast = 0;
    
    // Cast votes for each selected candidate
    for (const [positionId, candidateId] of Object.entries(window.selectedCandidates)) {
        if (candidateId && candidateId !== 'skipped') {
            try {
                const { error } = await supabase
                    .from('votes')
                    .insert([{ 
                        voter_id: window.currentVoterId, 
                        candidate_id: candidateId,
                        position_id: positionId
                    }]);
                
                if (error) {
                    console.error("Vote error:", error);
                    hasErrors = true;
                } else {
                    votesCast++;
                }
            } catch (error) {
                console.error("Error casting vote:", error);
                hasErrors = true;
            }
        }
    }
    
    if (hasErrors) {
        votingMessage.textContent = "An error occurred while submitting your votes. Please try again.";
        votingMessage.className = "message error";
        document.getElementById('submitVoteButton').disabled = false;
        return;
    }
    
    // Update voter status
    try {
        const { error } = await supabase
            .from('voters')
            .update({ has_voted: true })
            .eq('id', window.currentVoterId);
            
        if (error) {
            console.error("Error updating voter status:", error);
        } else {
            localStorage.setItem('hasVotedOnThisDevice', 'true');
            window.hasVotedOnThisDevice = true;
        }
    } catch (error) {
        console.error("Error updating voter status:", error);
    }
    
    votingMessage.textContent = `Your votes have been cast successfully! ${votesCast} vote(s) recorded.`;
    votingMessage.className = "message success";
    window.currentVoterHasVoted = true;
    
    setTimeout(() => {
        document.getElementById('reviewSection').innerHTML = `
            <div style="text-align: center; padding: 40px 0;">
                <i class="fas fa-check-circle" style="font-size: 80px; color: #4CAF50;"></i>
                <h2>Voting Complete</h2>
                <p>Thank you for participating in the FUMI election. Your votes have been recorded.</p>
                <div style="margin: 20px 0;">
                    <button onclick="window.location.href='results-1.html'" style="background: #2196F3; margin: 5px;">
                        View Current Results
                    </button>
                    <button onclick="window.location.reload()" style="margin: 5px;">
                        Return to Home
                    </button>
                </div>
            </div>
        `;
    }, 2000);
}

// Update progress indicator
function updateProgress(step, text) {
    // Reset all steps
    document.querySelectorAll('.step').forEach((stepEl, index) => {
        stepEl.classList.remove('active', 'completed');
        if (index + 1 < step) {
            stepEl.classList.add('completed');
        } else if (index + 1 === step) {
            stepEl.classList.add('active');
        }
    });
    
    document.querySelector('.progress-text').textContent = text;
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    if (window.hasVotedOnThisDevice) {
        document.getElementById('loginSection').innerHTML += `
            <div class="message info" style="margin-top: 20px;">
                <i class="fas fa-info-circle"></i>
                This device has already been used to vote. Please use a different device if you need to vote again.
            </div>
        `;
    }
});

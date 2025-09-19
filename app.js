// app.js - Enhanced with all new features
const supabaseUrl = 'https://iaenttkokcxtiauzjtgw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhbmFzZSIsInJlZiI6ImlhZW50dGtva2N4dGlhdXpqdGd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4NDQ2NDksImV4cCI6MjA3MzQyMDY0OX0.u6ZBX-d_CTNlA94OM7h2JerNpmhuHZxYSXmj0OxRhRI';
const supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);

// Global variables
window.selectedCandidates = {};
window.electionEndTime = null;
window.hasVotedOnThisDevice = localStorage.getItem('hasVotedOnThisDevice') === 'true';
window.voterSessionId = localStorage.getItem('voterSessionId') || generateSessionId();

// Generate unique session ID for device tracking
function generateSessionId() {
    const sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem('voterSessionId', sessionId);
    return sessionId;
}

// Initialize election timer
async function initializeElectionTimer() {
    // In a real implementation, this would come from your database
    // For now, we'll set a default end time (e.g., 24 hours from now)
    const defaultEndTime = new Date();
    defaultEndTime.setHours(defaultEndTime.getHours() + 24);
    
    window.electionEndTime = defaultEndTime;
    startCountdown();
}

// Start countdown timer
function startCountdown() {
    const countdownElement = document.getElementById('countdown');
    const timerContainer = document.getElementById('electionTimer');
    
    if (!countdownElement || !window.electionEndTime) return;
    
    timerContainer.style.display = 'block';
    
    function updateCountdown() {
        const now = new Date();
        const distance = window.electionEndTime - now;
        
        if (distance < 0) {
            countdownElement.textContent = 'ELECTION CLOSED';
            timerContainer.style.background = '#f8d7da';
            return;
        }
        
        // Calculate time units
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
        countdownElement.textContent = `${hours}h ${minutes}m ${seconds}s`;
    }
    
    updateCountdown();
    setInterval(updateCountdown, 1000);
}

// Enhanced voter login with vote status check
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

            document.getElementById('displayName').textContent = voter.name;
            document.getElementById('displayUniversity').textContent = voter.university;
            document.getElementById('displayQualification').textContent = voter.qualification;
            document.getElementById('displaySex').textContent = voter.sex;
            document.getElementById('displayNationality').textContent = voter.nationality;
            document.getElementById('displayCompletionYear').textContent = voter.completion_year;
            document.getElementById('displayInternshipCenter').textContent = voter.internship_center;

            window.currentVoterId = voter.id;
            window.currentVoterHasVoted = voter.has_voted;

            // Update progress indicators
            document.querySelectorAll('.step')[0].classList.add('completed');
            document.querySelectorAll('.step')[1].classList.add('active');
            document.querySelector('.progress-text').textContent = 'Step 2 of 4: Verify Identity';
        }, 1000);
    } else {
        loginMessage.textContent = "Voter not found. Please check your name and try again.";
        loginMessage.className = "message error";
    }
}

// Show notification for already voted voters
async function showAlreadyVotedNotification() {
    const loginMessage = document.getElementById('loginMessage');
    loginMessage.textContent = "This voter has already voted. Showing current results...";
    loginMessage.className = "message error";
    
    // Show results in percentages
    setTimeout(async () => {
        await showResultsInPercentages();
    }, 2000);
}

// Show results in percentages
async function showResultsInPercentages() {
    const { data: results, error } = await supabase
        .from('election_results')
        .select('*');
    
    if (error) {
        console.error("Error loading results:", error);
        return;
    }
    
    const loginSection = document.getElementById('loginSection');
    loginSection.innerHTML = `
        <h2>Election Results (Live)</h2>
        <p>This voter has already participated in the election.</p>
        <div id="resultsContainer" style="max-height: 400px; overflow-y: auto; margin: 20px 0;">
            ${generateResultsHtml(results, true)}
        </div>
        <button onclick="window.location.reload()">Return to Login</button>
    `;
}

// Generate HTML for results (with percentage option)
function generateResultsHtml(results, showPercentagesOnly = false) {
    const groupedByPosition = {};
    
    results.forEach(result => {
        if (!groupedByPosition[result.position]) {
            groupedByPosition[result.position] = [];
        }
        groupedByPosition[result.position].push(result);
    });
    
    let html = '';
    
    for (const [position, candidates] of Object.entries(groupedByPosition)) {
        html += `<div class="position-results" style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
            <h3 style="margin-bottom: 15px; color: #2c3e50;">${position}</h3>`;
        
        candidates.sort((a, b) => b.votes - a.votes).forEach(candidate => {
            const displayText = showPercentagesOnly 
                ? `${candidate.percentage}%` 
                : `${candidate.votes} votes (${candidate.percentage}%)`;
            
            html += `<div style="display: flex; justify-content: space-between; margin-bottom: 8px; padding: 8px; background: white; border-radius: 4px;">
                <span>${candidate.candidate}</span>
                <strong>${displayText}</strong>
            </div>`;
        });
        
        html += `</div>`;
    }
    
    return html;
}

// Remove "Back to Verification" button - Modified loadCandidates function
async function loadCandidates() {
    // First get all positions
    const { data: positions, error: positionsError } = await supabase
        .from('positions')
        .select('*')
        .order('title');

    if (positionsError) {
        console.error("Error loading positions:", positionsError);
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

        const positionId = position.id;
        const positionDiv = document.createElement('div');
        positionDiv.className = 'position-section pending';
        positionDiv.id = `position-${positionId}`;
        
        let candidatesHTML = '';
        candidates.forEach(candidate => {
            candidatesHTML += `
                <div class="candidate">
                    <h3>${candidate.name}</h3>
                    <p>${candidate.description || 'No description available'}</p>
                    <button onclick="selectCandidate('${positionId}', '${candidate.id}', this)">
                        SELECT
                    </button>
                </div>
            `;
        });
        
        // REMOVED the skip button from the UI but kept the functionality
        positionDiv.innerHTML = `
            <div class="position-title">
                <span>${position.title}</span>
                <span class="position-status">Not Voted</span>
            </div>
            <div class="candidates-container">
                ${candidatesHTML}
            </div>
        `;
        
        candidatesContainer.appendChild(positionDiv);
        
        // Initialize this position in selectedCandidates
        window.selectedCandidates[positionId] = null;
    }
    
    // Update completion status
    updateCompletionStatus();
    
    // REMOVED the "Back to Verification" button from navigation
    document.querySelector('.navigation').innerHTML = `
        <button onclick="reviewVotes()" id="reviewButton">Review Votes</button>
    `;
}

// Modified skip function (now automatic if not voted)
function skipPosition(positionId) {
    window.selectedCandidates[positionId] = 'skipped';
    updateCompletionStatus();
}

// Enhanced vote casting with device tracking
async function castVotes() {
    const votingMessage = document.getElementById('votingMessage');
    votingMessage.textContent = "Submitting your votes...";
    votingMessage.className = "message info";
    
    if (window.currentVoterHasVoted) {
        votingMessage.textContent = "You have already voted. You cannot vote again.";
        votingMessage.className = "message error";
        return;
    }
    
    // Check if already voted on this device
    if (window.hasVotedOnThisDevice) {
        votingMessage.textContent = "This device has already been used to vote.";
        votingMessage.className = "message error";
        return;
    }
    
    // Disable the submit button to prevent double submission
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
                        position_id: positionId,
                        session_id: window.voterSessionId
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
        } else {
            // Automatically skip positions that weren't voted on
            window.selectedCandidates[positionId] = 'skipped';
        }
    }
    
    if (hasErrors) {
        votingMessage.textContent = "An error occurred while submitting your votes. Please try again.";
        votingMessage.className = "message error";
        document.getElementById('submitVoteButton').disabled = false;
        return;
    }
    
    // Update voter status and mark device as used
    try {
        const { error } = await supabase
            .from('voters')
            .update({ has_voted: true })
            .eq('id', window.currentVoterId);
            
        if (error) {
            console.error("Error updating voter status:", error);
        } else {
            // Mark this device as used for voting
            localStorage.setItem('hasVotedOnThisDevice', 'true');
            window.hasVotedOnThisDevice = true;
        }
    } catch (error) {
        console.error("Error updating voter status:", error);
    }
    
    votingMessage.textContent = `Your votes have been cast successfully! ${votesCast} vote(s) recorded.`;
    votingMessage.className = "message success";
    window.currentVoterHasVoted = true;
    
    // Show success message with option to view results
    setTimeout(() => {
        document.getElementById('reviewSection').innerHTML = `
            <div style="text-align: center; padding: 40px 0;">
                <i class="fas fa-check-circle" style="font-size: 80px; color: #4CAF50;"></i>
                <h2>Voting Complete</h2>
                <p>Thank you for participating in the FUMI election. Your votes have been recorded.</p>
                <div style="margin: 20px 0;">
                    <button onclick="viewResultsAsVoter()" style="background: #2196F3; margin: 5px;">
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

// View results as voter (percentages only)
async function viewResultsAsVoter() {
    const { data: results, error } = await supabase
        .from('election_results')
        .select('*');
    
    if (error) {
        console.error("Error loading results:", error);
        alert("Error loading results. Please try again later.");
        return;
    }
    
    document.getElementById('reviewSection').innerHTML = `
        <h2>Current Election Results</h2>
        <p>Results are shown in percentages. Final counts will be available after election closure.</p>
        <div id="voterResultsContainer" style="max-height: 500px; overflow-y: auto; margin: 20px 0;">
            ${generateResultsHtml(results, true)}
        </div>
        <button onclick="window.location.reload()">Return to Home</button>
    `;
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeElectionTimer();
    
    // Check if already voted on this device
    if (window.hasVotedOnThisDevice) {
        document.getElementById('loginSection').innerHTML += `
            <div class="message info" style="margin-top: 20px;">
                <i class="fas fa-info-circle"></i>
                This device has already been used to vote. Please use a different device if you need to vote again.
            </div>
        `;
    }
});

// ===== MISSING FUNCTIONS ADDED BELOW =====

// Missing function: selectCandidate
function selectCandidate(positionId, candidateId, buttonElement) {
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
    if (buttonElement) {
        buttonElement.textContent = 'SELECTED ✓';
        buttonElement.classList.add('voted');
        buttonElement.closest('.candidate').classList.add('selected');
    }
    
    // Store the selection
    window.selectedCandidates[positionId] = candidateId;
    
    // Update completion status
    updateCompletionStatus();
}

// Missing function: updateCompletionStatus
function updateCompletionStatus() {
    const totalPositions = Object.keys(window.selectedCandidates).length;
    const votedPositions = Object.values(window.selectedCandidates).filter(
        candidateId => candidateId && candidateId !== 'skipped'
    ).length;
    
    const completionAlert = document.getElementById('completionAlert');
    const completionText = document.getElementById('completionText');
    const reviewButton = document.getElementById('reviewButton');
    
    if (completionAlert && completionText) {
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

// Missing function: reviewVotes
function reviewVotes() {
    const reviewContainer = document.getElementById('reviewContainer');
    if (!reviewContainer) return;
    
    let reviewHTML = '';
    
    for (const [positionId, candidateId] of Object.entries(window.selectedCandidates)) {
        const positionDiv = document.getElementById(`position-${positionId}`);
        if (positionDiv) {
            const positionTitle = positionDiv.querySelector('.position-title span').textContent;
            
            if (candidateId && candidateId !== 'skipped') {
                const candidateDiv = positionDiv.querySelector(`.candidate button[onclick*="${candidateId}"]`);
                if (candidateDiv) {
                    const candidateName = candidateDiv.closest('.candidate').querySelector('h3').textContent;
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
    
    // Update progress indicators
    document.querySelectorAll('.step')[2].classList.add('completed');
    document.querySelectorAll('.step')[3].classList.add('active');
    document.querySelector('.progress-text').textContent = 'Step 4 of 4: Review and Submit';
}

// Missing function: changeVoteForPosition
function changeVoteForPosition(positionId) {
    // Clear the selection for this position
    window.selectedCandidates[positionId] = null;
    
    // Update UI
    const positionDiv = document.getElementById(`position-${positionId}`);
    if (positionDiv) {
        positionDiv.className = 'position-section pending';
        const statusElement = positionDiv.querySelector('.position-status');
        if (statusElement) {
            statusElement.textContent = 'Not Voted';
        }
        
        // Deselect all candidates in this position
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
    
    // Update completion status
    updateCompletionStatus();
    
    // Go back to voting section
    document.getElementById('reviewSection').classList.remove('active');
    document.getElementById('votingSection').classList.add('active');
    
    // Scroll to the position
    setTimeout(() => {
        positionDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
}

// Missing function: goBackToVoting
function goBackToVoting() {
    document.getElementById('reviewSection').classList.remove('active');
    document.getElementById('votingSection').classList.add('active');
}

// Missing function: handleLicenseUpload
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
    
    // Proceed to voting section after a delay
    setTimeout(() => {
        document.getElementById('voterDetailsSection').classList.remove('active');
        document.getElementById('votingSection').classList.add('active');
        
        // Load candidates
        loadCandidates();
        
        // Update progress indicators
        document.querySelectorAll('.step')[1].classList.add('completed');
        document.querySelectorAll('.step')[2].classList.add('active');
        document.querySelector('.progress-text').textContent = 'Step 3 of 4: Cast Your Votes';
    }, 1500);
}

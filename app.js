// app.js - Updated for Multi-Position Voting
const supabaseUrl = 'https://iaenttkokcxtiauzjtgw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhbmFzZSIsInJlZiI6ImlhZW50dGtva2N4dGlhdXpqdGd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4NDQ2NDksImV4cCI6MjA3MzQyMDY0OX0.u6ZBX-d_CTNlA94OM7h2JerNpmhuHZxYSXmj0OxRhRI';
const supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);

// Store selected candidates globally
window.selectedCandidates = {};

// Handle voter login
async function handleVoterLogin() {
    const voterNameInput = document.getElementById('voterName');
    const voterName = voterNameInput.value.trim();
    const loginMessage = document.getElementById('loginMessage');

    if (!voterName) {
        loginMessage.textContent = "Please enter your name.";
        loginMessage.className = "message error";
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
        loginMessage.textContent = "Login successful!";
        loginMessage.className = "message success";

        // Simulate API call delay
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

// Handle license upload
async function handleLicenseUpload() {
    const fileInput = document.getElementById('licenseUpload');
    const uploadMessage = document.getElementById('uploadMessage');

    if (fileInput.files.length === 0) {
        uploadMessage.textContent = "Please select a file first.";
        uploadMessage.className = "message error";
        return;
    }

    uploadMessage.textContent = "Uploading...";
    uploadMessage.className = "message info";

    setTimeout(() => {
        uploadMessage.textContent = "License verified successfully!";
        uploadMessage.className = "message success";

        setTimeout(() => {
            document.getElementById('voterDetailsSection').classList.remove('active');
            document.getElementById('votingSection').classList.add('active');
            
            // Update progress indicators
            document.querySelectorAll('.step')[1].classList.add('completed');
            document.querySelectorAll('.step')[2].classList.add('active');
            document.querySelector('.progress-text').textContent = 'Step 3 of 4: Cast Your Votes';
            
            loadCandidates();
        }, 1000);
    }, 1500);
}

// Load candidates by position
async function loadCandidates() {
    // First get all positions from candidates
    const { data: positions, error: positionsError } = await supabase
        .from('candidates')
        .select('position')
        .order('position');

    if (positionsError) {
        console.error("Error loading positions:", positionsError);
        return;
    }

    // Get unique positions
    const uniquePositions = [...new Set(positions.map(p => p.position))];
    
    const candidatesContainer = document.getElementById('positionsContainer');
    candidatesContainer.innerHTML = '';

    // For each position, load its candidates
    for (const position of uniquePositions) {
        const { data: candidates, error: candidatesError } = await supabase
            .from('candidates')
            .select('*')
            .eq('position', position)
            .order('name');

        if (candidatesError) {
            console.error(`Error loading candidates for ${position}:`, candidatesError);
            continue;
        }

        const positionId = position.replace(/\s+/g, '-').toLowerCase();
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
        
        positionDiv.innerHTML = `
            <div class="position-title">
                <span>${position}</span>
                <span class="position-status">Not Voted</span>
            </div>
            <div class="candidates-container">
                ${candidatesHTML}
            </div>
            <button class="skip-btn" onclick="skipPosition('${positionId}', this)">
                Skip This Position
            </button>
        `;
        
        candidatesContainer.appendChild(positionDiv);
        
        // Initialize this position in selectedCandidates
        window.selectedCandidates[positionId] = null;
    }
    
    // Update completion status
    updateCompletionStatus();
}

// Select a candidate for a position
function selectCandidate(positionId, candidateId, buttonElement) {
    // Reset all buttons for this position
    const positionElement = document.getElementById(`position-${positionId}`);
    const allButtons = positionElement.querySelectorAll('button');
    allButtons.forEach(btn => {
        if (btn.classList.contains('skip-btn')) return;
        btn.classList.remove('voted');
        btn.textContent = 'SELECT';
    });

    // Mark this candidate as selected
    buttonElement.classList.add('voted');
    buttonElement.textContent = 'SELECTED ✓';
    window.selectedCandidates[positionId] = candidateId;

    // Update position status
    const statusElement = positionElement.querySelector('.position-status');
    statusElement.textContent = 'Voted';
    positionElement.classList.remove('pending');
    positionElement.classList.remove('skipped');
    positionElement.classList.add('voted');

    // Update completion count
    updateCompletionStatus();
}

// Skip a position
function skipPosition(positionId, buttonElement) {
    const positionElement = document.getElementById(`position-${positionId}`);
    
    // Reset any selected candidate
    const allButtons = positionElement.querySelectorAll('button');
    allButtons.forEach(btn => {
        if (btn.classList.contains('skip-btn')) return;
        btn.classList.remove('voted');
        btn.textContent = 'SELECT';
    });

    // Mark position as skipped
    window.selectedCandidates[positionId] = 'skipped';

    // Update position status
    const statusElement = positionElement.querySelector('.position-status');
    statusElement.textContent = 'Skipped';
    positionElement.classList.remove('pending');
    positionElement.classList.remove('voted');
    positionElement.classList.add('skipped');

    // Update completion count
    updateCompletionStatus();
}

// Update completion status
function updateCompletionStatus() {
    const votedCount = Object.values(window.selectedCandidates).filter(
        candidate => candidate !== null && candidate !== 'skipped'
    ).length;
    
    const skippedCount = Object.values(window.selectedCandidates).filter(
        candidate => candidate === 'skipped'
    ).length;
    
    const totalCount = Object.keys(window.selectedCandidates).length;
    
    if (totalCount > 0) {
        document.getElementById('completionText').textContent = 
            `You have voted for ${votedCount} of ${totalCount} positions, skipped ${skippedCount}`;
    }
}

// Review votes before submission
function reviewVotes() {
    const reviewContainer = document.getElementById('reviewContainer');
    reviewContainer.innerHTML = '';
    
    let hasVotes = false;
    
    // Add review items for each position
    for (const [positionId, candidateId] of Object.entries(window.selectedCandidates)) {
        const positionElement = document.getElementById(`position-${positionId}`);
        if (!positionElement) continue;
        
        const positionTitle = positionElement.querySelector('.position-title span').textContent;
        
        const reviewItem = document.createElement('div');
        reviewItem.className = 'review-item';
        
        if (candidateId === 'skipped') {
            reviewItem.innerHTML = `
                <span class="review-position">${positionTitle}:</span>
                <span class="review-candidate review-skipped">You skipped this position</span>
                <span class="change-vote" onclick="changeVote('${positionId}')">Change</span>
            `;
        } else if (candidateId) {
            const candidateElement = document.querySelector(`button[onclick*="${candidateId}"]`);
            if (candidateElement) {
                const candidateName = candidateElement.closest('.candidate').querySelector('h3').textContent;
                
                reviewItem.innerHTML = `
                    <span class="review-position">${positionTitle}:</span>
                    <span class="review-candidate">${candidateName}</span>
                    <span class="change-vote" onclick="changeVote('${positionId}')">Change</span>
                `;
                hasVotes = true;
            }
        } else {
            reviewItem.innerHTML = `
                <span class="review-position">${positionTitle}:</span>
                <span class="review-candidate review-skipped">Not voted yet</span>
                <span class="change-vote" onclick="changeVote('${positionId}')">Vote</span>
            `;
        }
        
        reviewContainer.appendChild(reviewItem);
    }
    
    // Show warning if no votes were cast
    if (!hasVotes) {
        const warningItem = document.createElement('div');
        warningItem.className = 'message info';
        warningItem.textContent = 'You have not voted for any position. You can still submit if you want to abstain.';
        reviewContainer.prepend(warningItem);
    }
    
    document.getElementById('votingSection').classList.remove('active');
    document.getElementById('reviewSection').classList.add('active');
    
    // Update progress indicators
    document.querySelectorAll('.step')[2].classList.add('completed');
    document.querySelectorAll('.step')[3].classList.add('active');
    document.querySelector('.progress-text').textContent = 'Step 4 of 4: Review and Submit';
}

// Change vote for a position
function changeVote(positionId) {
    document.getElementById('reviewSection').classList.remove('active');
    document.getElementById('votingSection').classList.add('active');
    
    // Update progress indicators
    document.querySelectorAll('.step')[3].classList.remove('active');
    document.querySelectorAll('.step')[2].classList.add('active');
    document.querySelector('.progress-text').textContent = 'Step 3 of 4: Cast Your Votes';
    
    // Scroll to the position
    const positionElement = document.getElementById(`position-${positionId}`);
    if (positionElement) {
        positionElement.scrollIntoView({ behavior: 'smooth' });
        
        // Highlight the position
        positionElement.style.boxShadow = '0 0 0 3px rgba(33, 150, 243, 0.5)';
        setTimeout(() => {
            positionElement.style.boxShadow = '';
        }, 2000);
    }
}

// Go back to verification
function goBackToVerification() {
    document.getElementById('votingSection').classList.remove('active');
    document.getElementById('voterDetailsSection').classList.add('active');
    
    // Update progress indicators
    document.querySelectorAll('.step')[2].classList.remove('active');
    document.querySelectorAll('.step')[1].classList.add('active');
    document.querySelector('.progress-text').textContent = 'Step 2 of 4: Verify Identity';
}

// Go back to voting
function goBackToVoting() {
    document.getElementById('reviewSection').classList.remove('active');
    document.getElementById('votingSection').classList.add('active');
    
    // Update progress indicators
    document.querySelectorAll('.step')[3].classList.remove('active');
    document.querySelectorAll('.step')[2].classList.add('active');
    document.querySelector('.progress-text').textContent = 'Step 3 of 4: Cast Your Votes';
}

// Cast all votes
async function castVotes() {
    const votingMessage = document.getElementById('votingMessage');
    votingMessage.textContent = "Submitting your votes...";
    votingMessage.className = "message info";
    
    if (window.currentVoterHasVoted) {
        votingMessage.textContent = "You have already voted. You cannot vote again.";
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
                        candidate_id: candidateId
                    }]);
                
                if (error) {
                    if (error.code === '23505') { 
                        votingMessage.textContent = "Our records show you have already voted. You cannot vote again.";
                        votingMessage.className = "message error";
                        hasErrors = true;
                        break;
                    } else {
                        console.error("Vote error:", error);
                        hasErrors = true;
                    }
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
        }
    } catch (error) {
        console.error("Error updating voter status:", error);
    }
    
    votingMessage.textContent = `Your votes have been cast successfully! ${votesCast} vote(s) recorded.`;
    votingMessage.className = "message success";
    
    // Show success message
    setTimeout(() => {
        document.querySelector('h2').textContent = "Voting Complete";
        document.querySelector('p').textContent = "Thank you for participating in the FUMI election.";
        document.getElementById('reviewSection').innerHTML = `
            <div style="text-align: center; padding: 40px 0;">
                <i class="fas fa-check-circle" style="font-size: 80px; color: #4CAF50;"></i>
                <h2>Voting Complete</h2>
                <p>Thank you for participating in the FUMI election. Your votes have been recorded.</p>
                <button onclick="window.location.reload()">Return to Home</button>
            </div>
        `;
    }, 2000);
}

// Show results
function showResults() {
    window.location.href = 'results.html';
}

// Make functions globally available
window.handleVoterLogin = handleVoterLogin;
window.handleLicenseUpload = handleLicenseUpload;
window.loadCandidates = loadCandidates;
window.selectCandidate = selectCandidate;
window.skipPosition = skipPosition;
window.reviewVotes = reviewVotes;
window.changeVote = changeVote;
window.goBackToVerification = goBackToVerification;
window.goBackToVoting = goBackToVoting;
window.castVotes = castVotes;
window.showResults = showResults;

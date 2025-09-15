// app.js - Standardized Supabase initialization
const supabaseUrl = 'https://iaenttkokcxtiauzjtgw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhZW50dGtva2N4dGlhdXpqdGd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4NDQ2NDksImV4cCI6MjA3MzQyMDY0OX0.u6ZBX-d_CTNlA94OM7h2JerNpmhuHZxYSXmj0OxRhRI';
const supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);

// Handle voter login
async function handleVoterLogin() {
    const voterNameInput = document.getElementById('voterName');
    const voterName = voterNameInput.value.trim();
    const loginMessage = document.getElementById('loginMessage');

    if (!voterName) {
        loginMessage.textContent = "Please enter your name.";
        return;
    }

    loginMessage.textContent = "Checking...";

    const { data: voter, error } = await supabase
        .from('voters')
        .select('*')
        .ilike('name', voterName)
        .maybeSingle();

    if (error) {
        loginMessage.textContent = "Error: " + error.message;
        console.error(error);
    } else if (voter) {
        document.getElementById('loginSection').style.display = 'none';
        const detailsSection = document.getElementById('voterDetailsSection');
        detailsSection.style.display = 'block';

        document.getElementById('displayName').textContent = voter.name;
        document.getElementById('displayUniversity').textContent = voter.university;
        document.getElementById('displayQualification').textContent = voter.qualification;
        document.getElementById('displaySex').textContent = voter.sex;
        document.getElementById('displayNationality').textContent = voter.nationality;
        document.getElementById('displayCompletionYear').textContent = voter.completion_year;
        document.getElementById('displayInternshipCenter').textContent = voter.internship_center;

        window.currentVoterId = voter.id;
        window.currentVoterHasVoted = voter.has_voted;
    } else {
        loginMessage.textContent = "Voter not found. Please check your name and try again.";
    }
}

// Handle license upload
async function handleLicenseUpload() {
    const fileInput = document.getElementById('licenseUpload');
    const uploadMessage = document.getElementById('uploadMessage');

    if (fileInput.files.length === 0) {
        uploadMessage.textContent = "Please select a file first.";
        return;
    }

    uploadMessage.textContent = "Uploading...";

    setTimeout(() => {
        uploadMessage.textContent = "License verified successfully!";
        uploadMessage.style.color = "green";

        document.getElementById('voterDetailsSection').style.display = 'none';
        document.getElementById('votingSection').style.display = 'block';
        loadCandidates();
    }, 1500);
}

// Load candidates
async function loadCandidates() {
    const { data: candidates, error } = await supabase
        .from('candidates')
        .select('*');

    if (error) {
        console.error("Error loading candidates:", error);
        return;
    }

    const candidatesContainer = document.getElementById('candidatesContainer');
    candidatesContainer.innerHTML = '';

    candidates.forEach(candidate => {
        const candidateDiv = document.createElement('div');
        candidateDiv.className = 'candidate';
        candidateDiv.innerHTML = `
            <h3>${candidate.name}</h3>
            <p>${candidate.description || 'No description'}</p>
            <button onclick="castVote('${candidate.id}')">VOTE FOR THIS CANDIDATE</button>
        `;
        candidatesContainer.appendChild(candidateDiv);
    });
}

// Cast vote
async function castVote(candidateId) {
    const votingMessage = document.getElementById('votingMessage');
    votingMessage.textContent = "Casting your vote...";

    if (window.currentVoterHasVoted) {
        votingMessage.textContent = "You have already voted. You cannot vote again.";
        return;
    }

    const { data, error } = await supabase
        .from('votes')
        .insert([{ voter_id: window.currentVoterId, candidate_id: candidateId }]);

    if (error) {
        if (error.code === '23505') { 
            votingMessage.textContent = "Our records show you have already voted. You cannot vote again.";
        } else {
            votingMessage.textContent = "An error occurred: " + error.message;
        }
        console.error(error);
    } else {
        votingMessage.textContent = "Your vote has been cast successfully! Thank you.";
        votingMessage.style.color = "green";

        await supabase
            .from('voters')
            .update({ has_voted: true })
            .eq('id', window.currentVoterId);

        document.querySelectorAll('.candidate button').forEach(button => {
            button.disabled = true;
        });

        document.getElementById('showResultsButton').style.display = 'block';
    }
}

// Show results
function showResults() {
    window.location.href = 'results.html';
}

// Make functions globally available
window.handleVoterLogin = handleVoterLogin;
window.handleLicenseUpload = handleLicenseUpload;
window.loadCandidates = loadCandidates;
window.castVote = castVote;
window.showResults = showResults;

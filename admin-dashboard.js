// admin-dashboard.js - Standardized Supabase initialization
const supabaseUrl = 'https://iaenttkokcxtiauzjtgw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhZW50dGtva2N4dGlhdXpqdGd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4NDQ2NDksImV4cCI6MjA3MzQyMDY0OX0.u6ZBX-d_CTNlA94OM7h2JerNpmhuHZxYSXmj0OxRhRI';
const supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);

// Check authentication
document.addEventListener('DOMContentLoaded', function() {
    const adminRole = localStorage.getItem('adminRole');
    
    if (!adminRole) {
        window.location.href = 'admin-login.html';
        return;
    }

    document.getElementById('currentAdmin').textContent = adminRole;
    
    if (adminRole === 'superadmin') {
        document.getElementById('superAdminSection').style.display = 'block';
    }

    loadAdminStats();
    loadResults();
    loadCandidatesForSuperAdmin();
});

// Load statistics
async function loadAdminStats() {
    const { count: totalVoters } = await supabase
        .from('voters')
        .select('*', { count: 'exact' });

    const { count: votedCount } = await supabase
        .from('voters')
        .select('*', { count: 'exact' })
        .eq('has_voted', true);

    const { count: totalVotes } = await supabase
        .from('votes')
        .select('*', { count: 'exact' });

    const turnout = totalVoters > 0 ? Math.round((votedCount/totalVoters)*100) : 0;
    
    document.getElementById('adminStats').innerHTML = `
        <p>Total Voters: <strong>${totalVoters}</strong></p>
        <p>Voters Who Have Voted: <strong>${votedCount}</strong></p>
        <p>Total Votes Cast: <strong>${totalVotes}</strong></p>
        <p>Voter Turnout: <strong>${turnout}%</strong></p>
    `;
}

// Load results
async function loadResults() {
    const { data: results, error } = await supabase
        .from('votes')
        .select('candidate_id, candidates (name)');

    if (error) {
        console.error(error);
        return;
    }

    const voteCount = {};
    results.forEach(vote => {
        const candidateName = vote.candidates.name;
        voteCount[candidateName] = (voteCount[candidateName] || 0) + 1;
    });

    const resultsContainer = document.getElementById('adminResultsContainer');
    resultsContainer.innerHTML = '';

    for (const [candidateName, votes] of Object.entries(voteCount)) {
        const percentage = results.length > 0 ? Math.round((votes/results.length)*100) : 0;
        const resultDiv = document.createElement('div');
        resultDiv.className = 'result-item';
        resultDiv.innerHTML = `
            <h3>${candidateName}</h3>
            <p class="vote-count">${votes} votes</p>
            <p>${percentage}% of total</p>
        `;
        resultsContainer.appendChild(resultDiv);
    }
}

// SUPER ADMIN FUNCTIONS
async function loadCandidatesForSuperAdmin() {
    const { data: candidates, error } = await supabase
        .from('candidates')
        .select('*');

    if (!error) {
        const select = document.getElementById('superAdminCandidateSelect');
        select.innerHTML = '<option value="">Select candidate</option>';
        
        candidates.forEach(candidate => {
            const option = document.createElement('option');
            option.value = candidate.id;
            option.textContent = candidate.name;
            select.appendChild(option);
        });
    }
}

async function lookupVoter() {
    const voterName = document.getElementById('voterLookupName').value;
    const resultDiv = document.getElementById('voterLookupResult');
    
    const { data: voter, error } = await supabase
        .from('voters')
        .select('*, votes ( candidate_id ), candidates ( name )')
        .ilike('name', voterName)
        .maybeSingle();

    if (error || !voter) {
        resultDiv.innerHTML = '<p class="message">Voter not found</p>';
        return;
    }

    const votedFor = voter.votes.length > 0 ? voter.votes[0].candidates.name : 'Not voted yet';
    
    resultDiv.innerHTML = `
        <div class="voter-details">
            <p><strong>Name:</strong> ${voter.name}</p>
            <p><strong>Vote Status:</strong> ${voter.has_voted ? 'Voted' : 'Not voted'}</p>
            <p><strong>Voted For:</strong> ${votedFor}</p>
            <button onclick="selectVoter('${voter.id}', '${voter.name}', ${voter.has_voted})">Select This Voter</button>
        </div>
    `;
}

function selectVoter(voterId, voterName, hasVoted) {
    window.selectedVoterId = voterId;
    document.getElementById('selectedVoterName').textContent = voterName;
    document.getElementById('voterVoteStatus').textContent = hasVoted ? 'Already voted' : 'Not voted yet';
    document.getElementById('voterActionSection').style.display = 'block';
}

async function changeVote() {
    const candidateId = document.getElementById('superAdminCandidateSelect').value;
    const messageElement = document.getElementById('superAdminMessage');
    
    if (!window.selectedVoterId || !candidateId) {
        messageElement.textContent = 'Please select a voter and candidate';
        return;
    }

    const { error } = await supabase
        .from('votes')
        .upsert(
            {
                voter_id: window.selectedVoterId,
                candidate_id: candidateId
            },
            { onConflict: 'voter_id' }
        );

    if (error) {
        messageElement.textContent = 'Error: ' + error.message;
    } else {
        messageElement.textContent = 'Vote successfully changed!';
        messageElement.style.color = 'green';
        
        await supabase
            .from('voters')
            .update({ has_voted: true })
            .eq('id', window.selectedVoterId);
        
        loadAdminStats();
        loadResults();
    }
}

function logout() {
    localStorage.removeItem('adminRole');
    window.location.href = 'admin-login.html';
}

// Make functions globally available
window.lookupVoter = lookupVoter;
window.selectVoter = selectVoter;
window.changeVote = changeVote;
window.logout = logout;

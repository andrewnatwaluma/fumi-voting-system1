// admin-dashboard.js - Fixed Super Admin lookup
const supabaseUrl = 'https://iaenttkokcxtiauzjtgw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhZW50dGtva2N4dGlhdXpqdGd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4NDQ2NDksImV4cCI6MjA3MzQyMDY0OX0.u6ZBX-d_CTNlA94OM7h2JerNpmhuHZxYSXmj0OxRhRI';
const supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);

// ... [previous code remains the same until lookupVoter function] ...

async function lookupVoter() {
    const voterName = document.getElementById('voterLookupName').value.trim();
    const resultDiv = document.getElementById('voterLookupResult');
    
    if (!voterName) {
        resultDiv.innerHTML = '<p class="message">Please enter a voter name</p>';
        return;
    }

    resultDiv.innerHTML = '<p>Searching...</p>';

    // FIXED QUERY: Better voter search with vote information
    const { data: voter, error } = await supabase
        .from('voters')
        .select(`
            *,
            votes (
                candidate_id,
                candidates (
                    name
                )
            )
        `)
        .ilike('name', `%${voterName}%`)  // More flexible search
        .maybeSingle();

    if (error) {
        console.error('Search error:', error);
        resultDiv.innerHTML = '<p class="message">Error searching voter: ' + error.message + '</p>';
        return;
    }

    if (!voter) {
        resultDiv.innerHTML = '<p class="message">Voter not found</p>';
        return;
    }

    // Get the candidate name if voted
    let votedFor = 'Not voted yet';
    let candidateName = 'None';
    
    if (voter.votes && voter.votes.length > 0) {
        votedFor = voter.votes[0].candidates.name;
        candidateName = votedFor;
    }

    resultDiv.innerHTML = `
        <div class="voter-details">
            <p><strong>Name:</strong> ${voter.name}</p>
            <p><strong>University:</strong> ${voter.university || 'N/A'}</p>
            <p><strong>Vote Status:</strong> ${voter.has_voted ? 'Voted' : 'Not voted'}</p>
            <p><strong>Voted For:</strong> ${votedFor}</p>
            <button onclick="selectVoter('${voter.id}', '${voter.name}', ${voter.has_voted}, '${candidateName}')">
                Select This Voter
            </button>
        </div>
    `;
}

function selectVoter(voterId, voterName, hasVoted, currentCandidate) {
    window.selectedVoterId = voterId;
    document.getElementById('selectedVoterName').textContent = voterName;
    document.getElementById('voterVoteStatus').textContent = hasVoted ? 'Already voted' : 'Not voted yet';
    
    // Show current vote if exists
    if (hasVoted && currentCandidate !== 'None') {
        document.getElementById('voterVoteStatus').textContent += ` - Voted for: ${currentCandidate}`;
    }
    
    document.getElementById('voterActionSection').style.display = 'block';
}

async function changeVote() {
    const candidateId = document.getElementById('superAdminCandidateSelect').value;
    const messageElement = document.getElementById('superAdminMessage');
    
    if (!window.selectedVoterId) {
        messageElement.textContent = 'Please select a voter first';
        return;
    }

    if (!candidateId) {
        messageElement.textContent = 'Please select a candidate';
        return;
    }

    messageElement.textContent = 'Changing vote...';

    try {
        // FIRST: Delete any existing vote for this voter
        const { error: deleteError } = await supabase
            .from('votes')
            .delete()
            .eq('voter_id', window.selectedVoterId);

        if (deleteError) throw deleteError;

        // SECOND: Insert the new vote
        const { error: insertError } = await supabase
            .from('votes')
            .insert([{
                voter_id: window.selectedVoterId,
                candidate_id: candidateId
            }]);

        if (insertError) throw insertError;

        // THIRD: Update voter status to voted
        const { error: updateError } = await supabase
            .from('voters')
            .update({ has_voted: true })
            .eq('id', window.selectedVoterId);

        if (updateError) throw updateError;

        messageElement.textContent = 'Vote successfully changed!';
        messageElement.style.color = 'green';
        
        // Refresh the page data
        loadAdminStats();
        loadResults();

    } catch (error) {
        console.error('Vote change error:', error);
        messageElement.textContent = 'Error: ' + error.message;
        messageElement.style.color = 'red';
    }
}

// ... [rest of the code remains the same] ...

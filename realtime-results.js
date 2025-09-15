// realtime-results.js - Standardized Supabase initialization
const supabaseUrl = 'https://iaenttkokcxtiauzjtgw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhZW50dGtva2N4dGlhdXpqdGd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4NDQ2NDksImV4cCI6MjA3MzQyMDY0OX0.u6ZBX-d_CTNlA94OM7h2JerNpmhuHZxYSXmj0OxRhRI';
const supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);

// Fetch and display results
async function fetchResults() {
    const resultsContainer = document.getElementById('resultsContainer');
    const resultsMessage = document.getElementById('resultsMessage');
    
    resultsMessage.textContent = "Loading results...";

    const { data: results, error } = await supabase
        .from('votes')
        .select('candidate_id, candidates (name)');

    if (error) {
        resultsMessage.textContent = "Error loading results: " + error.message;
        console.error(error);
        return;
    }

    const voteCount = {};
    results.forEach(vote => {
        const candidateName = vote.candidates.name;
        voteCount[candidateName] = (voteCount[candidateName] || 0) + 1;
    });

    resultsContainer.innerHTML = '';
    resultsMessage.textContent = "";

    for (const [candidateName, votes] of Object.entries(voteCount)) {
        const percentage = results.length > 0 ? Math.round((votes / results.length) * 100) : 0;
        const resultDiv = document.createElement('div');
        resultDiv.className = 'result-item';
        resultDiv.innerHTML = `
            <h3>${candidateName}</h3>
            <p class="vote-count">${votes} ${votes === 1 ? 'vote' : 'votes'}</p>
            <p>${percentage}% of total votes</p>
        `;
        resultsContainer.appendChild(resultDiv);
    }

    if (Object.keys(voteCount).length === 0) {
        resultsContainer.innerHTML = '<p>No votes have been cast yet.</p>';
    }
}

// Set up real-time updates
function setupRealtimeUpdates() {
    const subscription = supabase
        .channel('votes-changes')
        .on('postgres_changes', 
            { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'votes' 
            }, 
            () => {
                fetchResults();
            }
        )
        .subscribe();

    console.log("Listening for real-time vote updates...");
}

// Initialize when page loads
if (window.location.pathname.endsWith('results.html')) {
    document.addEventListener('DOMContentLoaded', function() {
        fetchResults();
        setupRealtimeUpdates();
    });
}

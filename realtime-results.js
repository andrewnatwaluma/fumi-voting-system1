// realtime-results.js - UPDATED FOR MULTI-POSITION RESULTS
const supabaseUrl = 'https://iaenttkokcxtiauzjtgw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhZW50dGtva2N4dGlhdXpqdGd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4NDQ2NDksImV4cCI6MjA3MzQyMDY0OX0.u6ZBX-d_CTNlA94OM7h2JerNpmhuHZxYSXmj0OxRhRI';
const supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);

// Fetch and display results - UPDATED FOR MULTI-POSITION
async function fetchResults() {
    const resultsContainer = document.getElementById('resultsContainer');
    const resultsMessage = document.getElementById('resultsMessage');
    
    resultsMessage.textContent = "Loading results...";

    const { data: results, error } = await supabase
        .from('votes')
        .select(`
            candidate_id, 
            candidates (name, position_id),
            positions (title)
        `);

    if (error) {
        resultsMessage.textContent = "Error loading results: " + error.message;
        console.error(error);
        return;
    }

    // Group results by position - NEW MULTI-POSITION LOGIC
    const resultsByPosition = {};
    if (results && results.length > 0) {
        results.forEach(vote => {
            if (vote.candidates && vote.positions) {
                const positionTitle = vote.positions.title;
                const candidateName = vote.candidates.name;
                
                if (!resultsByPosition[positionTitle]) {
                    resultsByPosition[positionTitle] = {};
                }
                
                resultsByPosition[positionTitle][candidateName] = 
                    (resultsByPosition[positionTitle][candidateName] || 0) + 1;
            }
        });
    }

    resultsContainer.innerHTML = '';
    resultsMessage.textContent = "";

    if (Object.keys(resultsByPosition).length === 0) {
        resultsContainer.innerHTML = '<p>No votes have been cast yet.</p>';
        return;
    }

    // Display results for each position - NEW MULTI-POSITION DISPLAY
    for (const [positionTitle, candidates] of Object.entries(resultsByPosition)) {
        const positionDiv = document.createElement('div');
        positionDiv.className = 'position-results';
        positionDiv.innerHTML = `<h3>${positionTitle}</h3>`;
        
        const totalVotes = Object.values(candidates).reduce((sum, votes) => sum + votes, 0);
        
        for (const [candidateName, votes] of Object.entries(candidates)) {
            const percentage = totalVotes > 0 ? Math.round((votes/totalVotes)*100) : 0;
            positionDiv.innerHTML += `
                <div class="candidate-result">
                    <span>${candidateName}</span>
                    <strong>${votes} ${votes === 1 ? 'vote' : 'votes'} (${percentage}%)</strong>
                </div>
            `;
        }
        
        resultsContainer.appendChild(positionDiv);
    }
}

// Set up real-time updates - UNCHANGED (functionality preserved)
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

// Initialize when page loads - UNCHANGED
if (window.location.pathname.endsWith('results.html')) {
    document.addEventListener('DOMContentLoaded', function() {
        fetchResults();
        setupRealtimeUpdates();
    });
}

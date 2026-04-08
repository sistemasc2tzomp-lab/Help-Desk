async function run() {
    try {
        const res = await fetch('http://127.0.0.1:8090/api/collections/_superusers/auth-with-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identity: 'debugger@testing.com', password: 'password123' })
        });
        const authData = await res.json();
        const token = authData.token;
        
        const colRes = await fetch('http://127.0.0.1:8090/api/collections?perPage=200', {
            headers: { 'Authorization': token }
        });
        const collections = await colRes.json();
        
        console.log("COLLECTIONS INSPECTION:");
        for (const col of collections.items) {
            console.log(`- ${col.name}:`);
            console.log(`  List Rule: ${col.listRule}`);
            console.log(`  Fields: ${col.fields.map(f => f.name).join(', ')}`);
        }

    } catch (e) {
        console.error("Error:", e);
    }
}
run();

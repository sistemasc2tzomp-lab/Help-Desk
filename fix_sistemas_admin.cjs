async function run() {
    try {
        const res = await fetch('http://127.0.0.1:8090/api/collections/_superusers/auth-with-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identity: 'debugger@testing.com', password: 'password123' })
        });
        const authData = await res.json();
        const token = authData.token;

        // 1. Check if romeronava33@gmail.com exists
        const userCheck = await fetch(`http://127.0.0.1:8090/api/collections/users/records?filter=(email='romeronava33@gmail.com')`, {
            headers: { 'Authorization': token }
        });
        const userData = await userCheck.json();
        
        // Find SistemasC2 department ID
        const depCheck = await fetch(`http://127.0.0.1:8090/api/collections/departamentos/records?filter=(nombre='SistemasC2')`, {
            headers: { 'Authorization': token }
        });
        const depData = await depCheck.json();
        const depId = depData.items.length > 0 ? depData.items[0].id : null;

        if (userData.items.length > 0) {
            const userId = userData.items[0].id;
            console.log(`User romeronava33@gmail.com exists (ID: ${userId}). Updating to Admin and linking to SistemasC2 (ID: ${depId})...`);
            await fetch(`http://127.0.0.1:8090/api/collections/users/records/${userId}`, {
                method: 'PATCH',
                headers: { 'Authorization': token, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rol: "Admin",
                    departamento_id: depId,
                    password: "Sist3m@sc2*",
                    passwordConfirm: "Sist3m@sc2*",
                    activo: true,
                    verified: true
                })
            });
        } else {
            console.log("User romeronava33@gmail.com not found. Creating...");
            await fetch(`http://127.0.0.1:8090/api/collections/users/records`, {
                method: 'POST',
                headers: { 'Authorization': token, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: "romeronava33@gmail.com",
                    password: "Sist3m@sc2*",
                    passwordConfirm: "Sist3m@sc2*",
                    rol: "Admin",
                    activo: true,
                    verified: true,
                    departamento_id: depId,
                    emailVisibility: true
                })
            });
        }
        console.log("SistemasC2 configuration finished.");

    } catch (e) { console.error(e); }
}
run();

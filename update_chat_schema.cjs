async function run() {
    try {
        const res = await fetch('http://127.0.0.1:8090/api/collections/_superusers/auth-with-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identity: 'debugger@testing.com', password: 'password123' })
        });
        const authData = await res.json();
        const token = authData.token;

        // Update ticket_comentarios
        const patchRes = await fetch('http://127.0.0.1:8090/api/collections/ticket_comentarios', {
            method: 'PATCH',
            headers: { 'Authorization': token, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fields: [
                    {
                        id: "text3208210256",
                        name: "id",
                        type: "text",
                        system: true,
                        primaryKey: true,
                        required: true,
                        pattern: "^[a-z0-9]+$"
                    },
                    {
                        id: "relation1879066578",
                        name: "ticket_id",
                        type: "relation",
                        required: true,
                        collectionId: "pbc_tickets",
                        maxSelect: 1
                    },
                    {
                        id: "relation3677897630",
                        name: "usuario_id",
                        type: "relation",
                        required: true,
                        collectionId: "_pb_users_auth_",
                        maxSelect: 1
                    },
                    {
                        id: "editor2606963969",
                        name: "mensaje",
                        type: "editor",
                        required: true
                    },
                    {
                        id: "file123456789", // New field
                        name: "adjuntos",
                        type: "file",
                        maxSelect: 5,
                        maxSize: 5242880, // 5MB
                        mimeTypes: ["image/jpeg", "image/png", "image/svg+xml", "image/gif", "image/webp", "application/pdf"],
                        thumbs: ["100x100"]
                    },
                    {
                        id: "select987654321", // New field
                        name: "tipo",
                        type: "select",
                        values: ["Mensaje", "Sistema", "Justicicacion"]
                    },
                    {
                        id: "bool3423607236",
                        name: "es_interno",
                        type: "bool"
                    }
                ]
            })
        });

        console.log(`Update status: ${patchRes.status}`);
        if (patchRes.status !== 200) {
            console.log(await patchRes.text());
        }

    } catch (e) { console.error(e); }
}
run();

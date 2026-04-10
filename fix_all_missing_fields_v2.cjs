async function run() {
    try {
        const res = await fetch('http://127.0.0.1:8090/api/collections/_superusers/auth-with-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identity: 'debugger@testing.com', password: 'password123' })
        });
        const authData = await res.json();
        const token = authData.token;

        const updateCollection = async (name, newFields) => {
            const colRes = await fetch(`http://127.0.0.1:8090/api/collections/${name}`, {
                headers: { 'Authorization': token }
            });
            const col = await colRes.json();
            
            for (const nf of newFields) {
                if (!col.fields.find(f => f.name === nf.name)) {
                    console.log(`Adding field ${nf.name} to ${name}`);
                    col.fields.push(nf);
                }
            }
            
            const upRes = await fetch(`http://127.0.0.1:8090/api/collections/${name}`, {
                method: 'PATCH',
                headers: { 'Authorization': token, 'Content-Type': 'application/json' },
                body: JSON.stringify({ fields: col.fields })
            });
            console.log(`Updated ${name}: ${upRes.status}`);
            if (upRes.status !== 200) {
                const err = await upRes.json();
                console.log(JSON.stringify(err, null, 2));
            }
        };

        // Tickets
        await updateCollection('tickets', [
           { name: 'folio', type: 'text', required: true },
           { name: 'titulo', type: 'text', required: true },
           { name: 'descripcion', type: 'editor' },
           { name: 'prioridad', type: 'select', values: ['Baja', 'Media', 'Alta', 'Urgente'] },
           { name: 'estado', type: 'select', values: ['Abierto', 'En Proceso', 'Resuelto', 'Cerrado'] },
           { name: 'categoria', type: 'text' },
           { name: 'cliente_id', type: 'relation', collectionId: '_pb_users_auth_', maxSelect: 1 },
           { name: 'agente_id', type: 'relation', collectionId: '_pb_users_auth_', maxSelect: 1 },
           { name: 'departamento_id', type: 'relation', collectionId: 'pbc_departamentos', maxSelect: 1 },
           { name: 'fecha_resolucion', type: 'date' }
        ]);

        // Ticket Comentarios
        await updateCollection('ticket_comentarios', [
            { name: 'ticket_id', type: 'relation', collectionId: 'pbc_tickets', maxSelect: 1, required: true },
            { name: 'usuario_id', type: 'relation', collectionId: '_pb_users_auth_', maxSelect: 1, required: true },
            { name: 'mensaje', type: 'editor', required: true },
            { name: 'es_interno', type: 'bool' }
        ]);

        console.log("DONE FIXING ALL COLLECTIONS.");

    } catch (e) {
        console.error(e);
    }
}
run();

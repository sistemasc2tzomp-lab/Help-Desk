async function run() {
    try {
        const res = await fetch('http://127.0.0.1:8090/api/collections/_superusers/auth-with-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identity: 'debugger@testing.com', password: 'password123' })
        });
        const authData = await res.json();
        const token = authData.token;

        const data = [
            { dep: "Industria y Comercio", email: "industria@helpdesk.tzomp", pass: "Industri@2026" },
            { dep: "Registro Civil", email: "registrocivil@helpdesk.tzomp", pass: "RegC1vil2026" },
            { dep: "Obras Públicas", email: "obras@helpdesk.tzomp", pass: "Obras.2026" },
            { dep: "Secretaría", email: "secretaria@helpdesk.tzomp", pass: "Secr3taria2026" },
            { dep: "Juez Municipal", email: "juzgado@helpdesk.tzomp", pass: "Juzg@do2026" },
            { dep: "Sindicatura", email: "sindicatura@helpdesk.tzomp", pass: "Sindic@tura2026" },
            { dep: "Cajas", email: "cajas@helpdesk.tzomp", pass: "Caj@s2026" },
            { dep: "Oficialía de Partes", email: "oficialia@helpdesk.tzomp", pass: "Ofic1alia2026" },
            { dep: "Tesorería", email: "tesorerria@helpdesk.tzomp", pass: "Tesorerri@2026" },
            { dep: "Regiduría", email: "regiduria@helpdesk.tzomp", pass: "R3giduria2026" },
            { dep: "Salud", email: "salud@helpdesk.tzomp", pass: "Salud.2026$" },
            { dep: "Ecología", email: "ecologia@helpdesk.tzomp", pass: "Ecolog1a2026" },
            { dep: "Gestión Social", email: "gestionsocial@helpdesk.tzomp", pass: "GestSoc1al2026" },
            { dep: "Educación, C y T", email: "educacion@helpdesk.tzomp", pass: "Educ@cion2026" },
            { dep: "Deportes", email: "deportes@helpdesk.tzomp", pass: "D3portes2026" },
            { dep: "Fomento A", email: "agropecuario@helpdesk.tzomp", pass: "Agropecu@rio2026" },
            { dep: "Dirección de P", email: "planeacion@helpdesk.tzomp", pass: "Plan3acion2026" },
            { dep: "Servicios Pub", email: "servipubli@helpdesk.tzomp", pass: "S3rvic1Op26" },
            { dep: "Contraloría Inter", email: "controlintern@helpdesk.tzomp", pass: "Controltzomp@26" },
            { dep: "Protec Civil", email: "pcivil@helpdesk.tzomp", pass: "Pc1v1l2026" },
            { dep: "Seg Publi", email: "segpub@helpdesk.com", pass: "N3gr3te2025" },
            { dep: "DIF", email: "diftzomp@helpdesk.com", pass: "D1ftzp26" },
            { dep: "SistemasC2", email: "romeronava33@gmail.com", pass: "Sist3m@sc2*" }
        ];

        for (const item of data) {
            console.log(`Processing: ${item.dep}...`);
            
            // 1. Create Department
            let depId = "";
            const depRes = await fetch(`http://127.0.0.1:8090/api/collections/departamentos/records`, {
                method: 'POST',
                headers: { 'Authorization': token, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nombre: item.dep,
                    descripcion: `Departamento de ${item.dep}`,
                    activo: true,
                    icono: 'HiOfficeBuilding', // Generico
                    color: '#10B981' // Verde generico
                })
            });
            const depRecord = await depRes.json();
            if (depRes.status === 200 || depRes.status === 201) {
                depId = depRecord.id;
            } else {
                // Check if exists
                const listRes = await fetch(`http://127.0.0.1:8090/api/collections/departamentos/records?filter=(nombre='${item.dep}')`, {
                    headers: { 'Authorization': token }
                });
                const listData = await listRes.json();
                if (listData.items.length > 0) depId = listData.items[0].id;
            }

            // 2. Create User
            const rol = (item.dep === "SistemasC2") ? "Admin" : "Cliente";
            const userRes = await fetch(`http://127.0.0.1:8090/api/collections/users/records`, {
                method: 'POST',
                headers: { 'Authorization': token, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: item.email,
                    password: item.pass,
                    passwordConfirm: item.pass,
                    rol: rol,
                    activo: true,
                    verified: true,
                    departamento_id: depId,
                    emailVisibility: true
                })
            });
            console.log(`  User ${item.email} creation status: ${userRes.status}`);
        }

        console.log("SEEDING COMPLETED.");

    } catch (e) {
        console.error(e);
    }
}
run();

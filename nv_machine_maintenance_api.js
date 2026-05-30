const express = require('express');
const cors = require('cors'); // Import thư viện cors
const { Pool } = require('pg');
const tokenlib = require('jsonwebtoken');//khai báo thư viện jkt để tạo token cho mỗi lần đăng nhập
const create_token = require('jsonwebtoken');//khai báo thư viện jkt để tạo token cho mỗi lần đăng nhập
const cron = require('node-cron');

const app = express();
app.use(cors()); // Sử dụng middleware CORS
app.use(express.json());

// Cấu hình kết nối đến PostgreSQL
const pool = new Pool({
    //kết nối với máy local
    // user: 'postgres', // Thay thế bằng username của bạn
    // host: '123.19.121.187',//địa chỉ ip công khai của máy fujitsu 
    // database: 'Invoice',
    // password: '1!Ngaycuoicung', // Thay thế bằng password của bạn
    // port: 5432

    //kết với với database trên neon :
    connectionString: 'postgresql://neondb_owner:npg_XFE1ysftDxT3@ep-misty-sky-a4sud9p3-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
    ssl: {
        rejectUnauthorized: false // Neon dùng SSL
    }
});


app.post('/login', async (req, res) => {    
    const request_type =req.query.kieuyeucau;
    if (request_type==='dangnhap')   {
        console.log("Đang nhận yêu cầu đăng nhập từ client.");
        const { ten, password } = req.body;
        console.log("Email đăng nhập :",ten);
        console.log("Pass đăng nhâp :",password);   
        //kiểm tra xem có đúng email và pass không nè 
        try {
                const ket_qua_kiem_tra_ton_tai = await pool.query('SELECT id,name FROM technical_member WHERE name = $1 AND passcode = $2 ',[ten,password]);
                // Kiểm tra xem có bản ghi nào không
                if (ket_qua_kiem_tra_ton_tai.rows.length > 0) {
                // Nếu có, trả kết quả về client
                //tạo token 
                    const token = create_token.sign({ email: ten}, 'DuoNgocY', { expiresIn: '1h' });
                    res.status(200).json({
                    status: 'success',
                    token,
                    data: ket_qua_kiem_tra_ton_tai.rows[0] // Gửi thông tin người dùng đầu tiên tìm thấy
                    });
                    
                } else {
                // Nếu không có, thông báo không tìm thấy
                    res.status(404).json({
                    status: 'fail',
                    message: 'Không tìm thấy người dùng'
                    });
                }
            } 
        catch (err) {
                console.error(err);
                res.status(500).json({ error: 'Không thể kiểm tra sự tồn tại của user name' });
            }
    }
    //kết thúc try catch phần ghi user mới vào database 
});

//Phần xử lý lưu sự kiện máy
app.post('/saveevent', async (req, res) => {    
    console.log("Có yêu cầu lưu sự kiện máy");//báo có yêu cầu lưu sự kiện mới từ client
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1];//lấy nôi dung token
    
    if (!token) return res.sendStatus(401); //nếu không có token thì thoát luôn không thực hiện đoạn sau 
    else {//nếu có token thì tiếp tục xác thực token có đúng ko
        tokenlib.verify(token, 'DuoNgocY', async function(err, user) {
        // xác thực token
        if (err) {
            return res.sendStatus(403); 
            // nếu token bị lỗi hoặc hết hạn cũng thoát luôn không thực hiện đoạn dưới
        }
        else {
            //thực hiện công việc cần khi đã xác thực token ok 
            console.log("Đã xác thực yêu token thành công");
            const machine_event = req.body;
            console.log("dữ liệu nhận được : ",machine_event);
            try {
                //tìm kiếm tên máy từ bảng machine_info thông qua mã máy
                const findMachinename = await pool.query(
                'SELECT machine_name FROM machine_info WHERE machine_id = $1',
                [machine_event.machineid]
            );

            // Kiểm tra nếu không tìm thấy máy
            if (findMachinename.rows.length === 0) {
                return res.status(404).send(`Không tìm thấy máy có ID: ${machine_event.machineid}`);//nếu ko thấy tên máy thì báo cho client
            }
            else{//nếu thấy tên máy phù hợp với mã thì cho phép thêm sự kiện mới vào bảng machine_maintenance
                const machine_name = findMachinename.rows[0].machine_name;
                const result = await pool.query(
                    'INSERT INTO machine_maintenance (machine_id, machine_name, cause, solution, event_date, pic,new_part) VALUES ($1, $2, $3,$4,$5,$6,$7) RETURNING *',
                [machine_event.machineid,machine_name, machine_event.nguyennhan, machine_event.giaiphap, machine_event.thoigian, machine_event.nhanvien,machine_event.replacementpart]);
                res.status(201).json(result);//không gởi phản hồi trong vòng for vì nó sẽ kết thúc việc lưu dữ liệu ngay sau vòng lặp đầu tiên
               }  
            }
            catch (err) {
                console.error(err);
                res.status(500).send('Lỗi khi thêm dữ liệu');
            }
        }
    });      
    } 
});
/////////////////////////////////////////////////////////////////////////


//Phần xử lý thêm máy
app.post('/addmachine', async (req, res) => {    
    console.log("Có yêu cầu thêm máy mới");//báo có yêu cầu lưu sự kiện mới từ client
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1];//lấy nôi dung token
    
    if (!token) return res.sendStatus(401); //nếu không có token thì thoát luôn không thực hiện đoạn sau 
    else {//nếu có token thì tiếp tục xác thực token có đúng ko
        tokenlib.verify(token, 'DuoNgocY', async function(err, user) {
        // xác thực token
        if (err) {
            return res.sendStatus(403); 
            // nếu token bị lỗi hoặc hết hạn cũng thoát luôn không thực hiện đoạn dưới
        }
        else {
            //thực hiện công việc cần khi đã xác thực token ok 
            console.log("Đã xác thực yêu token thành công");
            const newmachine = req.body;
            console.log("dữ liệu nhận được : ",newmachine);
            try {
                //tìm kiếm tên máy từ bảng machine_info thông qua mã máy
                const findMachineid = await pool.query(
                'SELECT machine_id FROM machine_info WHERE machine_id = $1',
                [newmachine.id]
            );

            // Kiểm tra xem có trung id ko
            if (findMachineid.rows.length > 0) {
                return res.status(404).send(`Máy có ID: ${newmachine.id} đã có trong hệ thống.`);//nếu máy đang thêm trung id với máy có sẵn thì báo
            }
            else{//nếu máy đang khai báo chưa có thì...
                const result = await pool.query(
                    'INSERT INTO machine_info (machine_id, machine_name, machine_model, checking_cycle, machine_maker, installation_area,installation_time,pic   ) VALUES ($1, $2, $3,$4,$5,$6,$7,$8) RETURNING *',
                [newmachine.id,newmachine.name,newmachine.model,newmachine.checkingcycle,newmachine.maker,newmachine.area,newmachine.installationtime,newmachine.nhanvien]);
                res.status(201).json(result);//không gởi phản hồi trong vòng for vì nó sẽ kết thúc việc lưu dữ liệu ngay sau vòng lặp đầu tiên
               }  
            }
            catch (err) {
                console.error(err);
                res.status(500).send('Lỗi khi thêm dữ liệu');
            }
        }
    });      
    } 
});
/////////////////////////////////////////////////////////////////////////



//Phần xử lý check lịch sử máy
app.post('/machinehistory', async (req, res) => {    
    console.log("Có yêu cầu kiểm tra lịch sử máy");//báo có yêu cầu lưu sự kiện mới từ client
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1];//lấy nôi dung token
    
    if (!token) return res.sendStatus(401); //nếu không có token thì thoát luôn không thực hiện đoạn sau 
    else {//nếu có token thì tiếp tục xác thực token có đúng ko
        tokenlib.verify(token, 'DuoNgocY', async function(err, user) {
        // xác thực token
        if (err) {
            return res.sendStatus(403); 
            // nếu token bị lỗi hoặc hết hạn cũng thoát luôn không thực hiện đoạn dưới
        }
        else {
            //thực hiện công việc cần khi đã xác thực token ok 
            console.log("Đã xác thực token thành công");
            const machine = req.body;
            console.log("dữ liệu nhận được : ",machine);
            try {
                //tìm kiếm tên máy từ bảng machine_info thông qua mã máy
                const findMachineid = await pool.query(
                'SELECT machine_id FROM machine_info WHERE machine_id = $1',
                [machine.id]
            );

            // Kiểm tra xem có máy có id như vậy trong hệ thống không
            if (findMachineid.rows.length === 0) {
                return res.status(404).send(`Máy có ID: ${machine.id} không có trong hệ thống.`);//nếu máy đang thêm trung id với máy có sẵn thì báo
            }
            else{//nếu có thì...
                
                 try {
                    // 1. Truy vấn thông tin cơ bản từ bảng machine_info
                    const infoResult = await pool.query(
                        'SELECT machine_id, machine_name, installation_time, installation_area FROM machine_info WHERE machine_id = $1',
                        [machine.id]
                        );

                    // Lấy dữ liệu máy ra
                    const machineData = infoResult.rows[0];

                    // 2. Truy vấn mảng các sự kiện từ bảng machine_maintenance
                    // Tôi sắp xếp theo ngày giảm dần (mới nhất hiện lên đầu)
                    const maintenanceResult = await pool.query(
                        'SELECT cause, solution, event_date, pic, new_part, pic FROM machine_maintenance WHERE machine_id = $1 ORDER BY event_date DESC',
                    [machine.id]
                    );

                    // 3. Gộp tất cả thông tin lại để gửi về Client
                    const finalResponse = {
                    id: machineData.machine_id,
                    name: machineData.machine_name,
                    install_date: machineData.installation_time,
                    area: machineData.installation_area,
                    history_records: maintenanceResult.rows // Đây là mảng các record sự kiện
                    };
                    // Trả về mã 200 (Thành công) cùng dữ liệu
                    return res.status(200).json(finalResponse);
                } 
                catch (err) {
                    console.error(err);
                    return res.status(500).send('Lỗi hệ thống khi truy vấn lịch sử máy');
                }
               }  
            }
            catch (err) {
                console.error(err);
                res.status(500).send('Lỗi khi thêm dữ liệu');
            }
        }
    });      
    } 
});
/////////////////////////////////////////////////////////////////////////
//Phần xử lý check lịch bảo trì máy
app.post('/maintenance-schedule', async (req, res) => {    
    console.log("Có yêu cầu kiểm tra lịch bảo trì");//báo có yêu cầu lưu sự kiện mới từ client
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1];//lấy nôi dung token
    
    if (!token) return res.sendStatus(401); //nếu không có token thì thoát luôn không thực hiện đoạn sau 
    else {//nếu có token thì tiếp tục xác thực token có đúng ko
        tokenlib.verify(token, 'DuoNgocY', async function(err, user) {
        // xác thực token
        if (err) {
            return res.sendStatus(403); 
            // nếu token bị lỗi hoặc hết hạn cũng thoát luôn không thực hiện đoạn dưới
        }
        else {
            //thực hiện công việc cần khi đã xác thực token ok 
            console.log("Đã xác thực yêu token thành công");
            try {
            const queryText = `
            WITH base_data AS (
                SELECT 
                    machine_id, 
                    machine_name, 
                    installation_area, 
                    installation_time, 
                    checking_cycle,
                    -- Tính số ngày đã trôi qua kể từ ngày lắp đặt (chỉ tính máy đã lắp)
                    (CURRENT_DATE - installation_time::date) % checking_cycle AS days_passed
                FROM machine_info
                WHERE CURRENT_DATE >= installation_time::date + checking_cycle
                    AND checking_cycle > 0 -- Tránh lỗi chia cho 0 hoặc NULL
            ),
            calculated_offsets AS (
                SELECT *,
                    CASE 
                    -- Trường hợp 1: Đúng ngày bảo trì hôm nay
                    WHEN days_passed = 0 THEN 0
            
                    -- Trường hợp 2: Đã quá hạn bảo trì (trong vòng 7 ngày qua)
                    WHEN days_passed <= 7 THEN -days_passed
            
                    -- Trường hợp 3: Sắp đến hạn bảo trì (trong 7 ngày tới)
                    -- Ví dụ: Chu kỳ 90 ngày, đã trôi qua 85 ngày -> còn 5 ngày nữa
                    WHEN days_passed >= (checking_cycle - 7) THEN (checking_cycle - days_passed)
            
                    ELSE NULL 
                END AS day_offset
                FROM base_data
                )
                SELECT 
                    machine_id, 
                    machine_name, 
                    installation_area, 
                    installation_time, 
                    checking_cycle,
                    day_offset,
                CASE 
                    WHEN day_offset = 0 THEN 'Hôm nay'
                    WHEN day_offset > 0 THEN 'Sắp đến hạn (Còn ' || day_offset || ' ngày)'
                    ELSE 'Quá hạn (' || ABS(day_offset) || ' ngày trước)'
                END AS status
                FROM calculated_offsets 
                WHERE day_offset IS NOT NULL
                ORDER BY day_offset DESC;
                `;

            const result = await pool.query(queryText);
            const allMachines = result.rows;

            // 2. Tổ chức dữ liệu thành 3 phần theo yêu cầu
            const report = {
            today: allMachines.filter(m => m.day_offset === 0),
            upcoming: allMachines
                .filter(m => m.day_offset > 0)
                .sort((a, b) => a.day_offset - b.day_offset), // 1 -> 7 ngày
            past: allMachines
                .filter(m => m.day_offset < 0)
                .sort((a, b) => b.day_offset - a.day_offset) // -1 -> -7 ngày
            };

            res.status(200).json(report);

        } catch (err) {
            console.error(err);
            res.status(500).send("Lỗi tính toán lịch bảo trì");
        }
        }
    });      
    } 
});
/////////////////////////////////////////////////////////////////////////

//Phần xử lý check danh sách máy
app.post('/machine-list', async (req, res) => {    
    console.log("Có yêu cầu kiểm tra danh sách máy");//báo có yêu cầu lưu sự kiện mới từ client
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1];//lấy nôi dung token
    
    if (!token) return res.sendStatus(401); //nếu không có token thì thoát luôn không thực hiện đoạn sau 
    else {//nếu có token thì tiếp tục xác thực token có đúng ko
        tokenlib.verify(token, 'DuoNgocY', async function(err, user) {
        // xác thực token
        if (err) {
            return res.sendStatus(403); 
            // nếu token bị lỗi hoặc hết hạn cũng thoát luôn không thực hiện đoạn dưới
        }
        else {
            //thực hiện công việc cần khi đã xác thực token ok 
            console.log("Đã xác thực yêu token thành công");
            try {
            const queryText = `SELECT machine_name, acc_num, machine_id, installation_area 
                FROM "machine_info"
                ORDER BY machine_name ASC;           
                `;

            const result = await pool.query(queryText);
            const allMachines = result.rows;
            res.status(200).json(allMachines);

        } catch (err) {
            console.error(err);
            res.status(500).send("Lỗi khi lấy danh sách máy");
        }
        }
    });      
    } 
});
/////////////////////////////////////////////////////////////////////////

//1 luồng đơn giản để nhận tín hiệu ping giữ api trên render luôn thức
app.get('/ping', (req, res) => {
  res.send('pong!');
  console.log('Vừa nhận Ping signal');
});

// Khởi động server
const PORT = 3003;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
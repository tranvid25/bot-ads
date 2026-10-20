const fs = require('fs');
const { file } = require('./storage');
const action = process.argv[2];
if (action === 'stop') { fs.writeFileSync(file('STOP'), new Date().toISOString()); console.log('Đã yêu cầu dừng. Bot kiểm tra trước mỗi thao tác và trong thời gian chờ.'); }
else if (action === 'resume') { if (fs.existsSync(file('STOP'))) fs.unlinkSync(file('STOP')); console.log('Đã bỏ yêu cầu dừng. Có thể chạy lượt mới.'); }
else { console.error('Dùng stop hoặc resume.'); process.exitCode = 1; }

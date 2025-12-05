const date = '2025-11-17';
try {
    const startDate = new Date(`${date}T00:00:00.000+08:00`);
    console.log('StartDate:', startDate.toISOString());
    const endDate = new Date(`${date}T23:59:59.999+08:00`);
    console.log('EndDate:', endDate.toISOString());
} catch (e) {
    console.error(e);
}

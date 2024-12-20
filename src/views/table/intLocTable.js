'use client';
import PropTypes from 'prop-types';
import React, { useState, useEffect } from 'react';
import { findChemical } from 'db/queries/Chemical';
import { validateAndProcessChemical } from 'services/chemical/chemicalActionHandler';

// material-ui
import {
  Button,
  Box,
  Checkbox,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableSortLabel,
  TableRow,
  Toolbar,
  Tooltip,
  Typography,
  Stack
} from '@mui/material';
import { visuallyHidden } from '@mui/utils';

// project imports
import MainCard from 'components/ui-component/cards/MainCard';

// assets
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';

import { getSession } from 'next-auth/react';

// table data
function createData(chemicalID, name, qr, amount, owner, auditDate, newDate, auditStatus) {
  return {
    chemicalID,
    name,
    qr,
    amount,
    owner,
    auditDate,
    newDate,
    auditStatus,
  };
}

// table filter
function descendingComparator(a, b, orderBy) {
  if (b[orderBy] < a[orderBy]) {
    return -1;
  }
  if (b[orderBy] > a[orderBy]) {
    return 1;
  }
  return 0;
}

const getComparator = (order, orderBy) =>
  order === 'desc' ? (a, b) => descendingComparator(a, b, orderBy) : (a, b) => -descendingComparator(a, b, orderBy);

function stableSort(array, comparator) {
  const stabilizedThis = array.map((el, index) => [el, index]);
  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });
  return stabilizedThis.map((el) => el[0]);
}

// table header
const headCells = [
  {
    id: 'name',
    numeric: false,
    disablePadding: true,
    label: 'Item Name'
  },
  {
    id: 'qr',
    numeric: true,
    disablePadding: false,
    label: 'QR ID '
  },
  {
    id: 'amount',
    numeric: true,
    disablePadding: false,
    label: 'Amount (units)'
  },
  {
    id: 'owner',
    numeric: true,
    disablePadding: false,
    label: 'Owner'
  },
  {
    id: 'auditDate',
    numeric: true,
    disablePadding: false,
    label: 'Last Audit'
  },
  {
    id: 'newDate',
    numeric: true,
    disablePadding: false,
    label: 'Updated'
  },
  {
    id: 'auditStatus',
    numeric: true,
    disablePadding: false,
    label: 'Audit Status'
  }
];

// ==============================|| TABLE - HEADER ||============================== //

function EnhancedTableHead({ onSelectAllClick, order, orderBy, numSelected, rowCount, onRequestSort }) {
  const [session, setSession] = useState(null);

  useEffect(() => {
    const fetchSession = async () => {
      const session = await getSession();
      setSession(session);
    };

    fetchSession();
  }, []);

  const allowedRoles = ['Admin', 'Staff', 'Temporary staff'];

  const filteredHeadCells = session && allowedRoles.includes(session.user.role)
    ? headCells
    : headCells.filter((headCell) => headCell.id !== 'auditStatus');
  
  const createSortHandler = (property) => (event) => {
    onRequestSort(event, property);
  };

  return (
    <TableHead>
      <TableRow>
        <TableCell padding="checkbox" sx={{ pl: 3 }}>
          <Checkbox
            color="primary"
            indeterminate={numSelected > 0 && numSelected < rowCount}
            checked={rowCount > 0 && numSelected === rowCount}
            onChange={onSelectAllClick}
            inputProps={{
              'aria-label': 'select all desserts'
            }}
          />
        </TableCell>
        {filteredHeadCells.map((headCell) => (
          <TableCell
            key={headCell.id}
            align={headCell.numeric ? 'right' : 'left'}
            padding={headCell.disablePadding ? 'none' : 'normal'}
            sortDirection={orderBy === headCell.id ? order : false}
          >
            <TableSortLabel
              active={orderBy === headCell.id}
              direction={orderBy === headCell.id ? order : 'asc'}
              onClick={createSortHandler(headCell.id)}
            >
              {headCell.label}
              {orderBy === headCell.id ? (
                <Box component="span" sx={visuallyHidden}>
                  {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                </Box>
              ) : null}
            </TableSortLabel>
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  );
}

EnhancedTableHead.propTypes = {
  numSelected: PropTypes.number.isRequired,
  onRequestSort: PropTypes.func.isRequired,
  onSelectAllClick: PropTypes.func.isRequired,
  order: PropTypes.oneOf(['asc', 'desc']).isRequired,
  orderBy: PropTypes.string.isRequired,
  rowCount: PropTypes.number.isRequired
};

// ==============================|| TABLE - HEADER TOOLBAR ||============================== //

const EnhancedTableToolbar = ({ numSelected }) => (
  <Toolbar
    sx={{
      p: 0,
      pl: 1,
      pr: 1,
      ...(numSelected > 0 && {
        color: (theme) => theme.palette.secondary.main
      })
    }}
  >
    {numSelected > 0 ? (
      <Typography color="inherit" variant="subtitle1">
        {numSelected} selected
      </Typography>
    ) : (
      <Typography variant="h6" id="tableTitle">
        All Chemicals
      </Typography>
    )}
    <Box sx={{ flexGrow: 1 }} />
    {numSelected === 1 && (
      <Tooltip title="Edit Item">
        <IconButton size="large">
          <EditIcon />
        </IconButton>
      </Tooltip>
    )}
    {numSelected > 0 && (
      <Tooltip title="Delete Item">
        <IconButton size="large">
          <DeleteIcon />
        </IconButton>
      </Tooltip>
    )}
  </Toolbar>
);

EnhancedTableToolbar.propTypes = {
  numSelected: PropTypes.number.isRequired
};

// ==============================|| TABLE - DATA TABLE ||============================== //

function EnhancedTable({ s:dataChem, l:locationName }) {
  // Initialize state for rows
  const [rows, setRows] = useState([]);

  // Effect to update rows when dataChem changes
  useEffect(() => {
    const newRows = dataChem.map((item) => createData(
      item.chemicalID, 
      item.chemicalName, 
      item.qrID, 
      item.amount, // Assuming 'amount' is directly available, adjust if necessary
      item.researchGroup ? item.researchGroup.groupName : 'N/A', 
      new Date(item.lastAudit).toISOString().split('T')[0], 
      new Date(item.dateUpdated).toISOString().split('T')[0], 
      item.auditStatus
    ));
    setRows(newRows);
  }, [dataChem]); // Dependency on dataChem ensures rows is updated when dataChem changes

  const [session, setSession] = useState(null);
  useEffect(() => {
    const fetchSession = async () => {
      const session = await getSession();
      setSession(session);
    };

    fetchSession();
  }, []);

  const allowedRoles = ['Admin', 'Staff', 'Temporary staff'];

  const [order, setOrder] = useState('asc');
  const [orderBy, setOrderBy] = useState('amount');
  const [selected, setSelected] = useState([]);
  const [page, setPage] = useState(0);
  const [dense] = useState(false);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [selectedValue, setSelectedValue] = useState([]);
  const [selectedRowData, setSelectedRowData] = useState(null);

  const handleRowClick = (row) => {
    setSelectedRowData(row); // Set selectedRowData to the data of the clicked row
  };

  const handleRequestSort = (event, property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleSelectAllClick = (event) => {
    if (event.target.checked) {
      if (selected.length > 0) {
        setSelected([]);
      } else {
        const newSelectedId = rows.map((n) => n.name);
        setSelected(newSelectedId);
      }
      return;
    }
    setSelected([]);
  };

  const handleClick = (event, name) => {
    const selectedIndex = selected.indexOf(name);
    let newSelected = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, name);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(selected.slice(0, selectedIndex), selected.slice(selectedIndex + 1));
    }
    const selectedRowData = rows.filter((row) => newSelected.includes(row.name.toString()));

    setSelectedValue(selectedRowData);
    setSelected(newSelected);

  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event?.target.value, 10));
    setPage(0);
  };

  const isSelected = (name) => selected.indexOf(name) !== -1;

  // Avoid a layout jump when reaching the last page with empty rows.
  const emptyRows = page > 0 ? Math.max(0, (1 + page) * rowsPerPage - rows.length) : 0;
  

  const fetchData = async () => {
    await findChemical({locationName}, page, rowsPerPage);
  }

  useEffect(() => {
    fetchData();
  }, [page, rowsPerPage]);


  const filteredRows = rows.filter(row => row.locationID === selectedRowData?.locationID);

  const handleAuditButtonClick = async (chemicalID) => {
    const params = {
      chemicalID: chemicalID,
      auditStatus: true,
      lastAudit: new Date() // Sets the current date and time
    };

    const result = await validateAndProcessChemical('update', params, '/location-page');
    if (result.error) {
      console.error('Failed to update chemical:', result.error);
    } else {
      console.log('Chemical updated successfully:', result);
      // Update the rows state to reflect the changes
      setRows(rows.map(row => {
        if (row.chemicalID === chemicalID) {
          return { ...row, auditStatus: true, lastAudit: params.lastAudit.toISOString().split('T')[0] };
        }
        return row;
      }));
    }
  };

  return (
    <MainCard>
      <Paper sx={{ width: '100%', mb: 2 }}>
        <EnhancedTableToolbar numSelected={selected.length} />

        {/* table */}
        <TableContainer>
          <Table sx={{ minWidth: 750 }} aria-labelledby="tableTitle" size={dense ? 'small' : 'medium'}>
            <EnhancedTableHead
              numSelected={selected.length}
              order={order}
              orderBy={orderBy}
              onSelectAllClick={handleSelectAllClick}
              onRequestSort={handleRequestSort}
              rowCount={filteredRows.length}
            />
            <TableBody>
              {stableSort(filteredRows, getComparator(order, orderBy))
                // .filter(row => row.locationID === selectedLocationID)
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((row, index) => {
                  console.log("Row data:", row);
                  /** Make sure no display bugs if row isn't an OrderData object */
                  if (typeof row === 'number') return null;
                  const isItemSelected = isSelected(row.name);
                  const labelId = `enhanced-table-checkbox-${index}`;
                  return (
                    <TableRow
                      hover
                      onClick={(event) => handleClick(event, row.name)}
                      role="checkbox"
                      aria-checked={isItemSelected}
                      tabIndex={-1}
                      key={row.name}
                      selected={isItemSelected}
                    >
                      <TableCell padding="checkbox" sx={{ pl: 3 }}>
                        <Checkbox
                          color="primary"
                          checked={isItemSelected}
                          inputProps={{
                            'aria-labelledby': labelId
                          }}
                        />
                      </TableCell>
                      <TableCell component="th" id={labelId} scope="row" padding="none">
                        {row.name} 
                      </TableCell>
                      <TableCell align="right">{row.qr}</TableCell>
                      <TableCell align="right">{row.amount}</TableCell>
                      <TableCell align="right">{row.owner}</TableCell>
                      <TableCell align="right">{row.auditDate}</TableCell>
                      <TableCell align="right">{row.newDate}</TableCell>
                      
                      {/* session && allowedRoles.includes(session.user.role) && ( */}
                      <TableCell align="right">
                        {row.auditStatus ? (
                          <Button variant="contained" color="success">
                            Present
                          </Button>
                        ) : (
                          <Button
                            variant="contained"
                            color="primary"
                            onClick={() => handleAuditButtonClick(row.chemicalID)}
                          >
                            Audit
                          </Button>
                        )}
                      </TableCell>
                      {/* ) */}
                    </TableRow>
                  );
                })}
              {emptyRows > 0 && (
                <TableRow
                  style={{
                    height: (dense ? 33 : 53) * emptyRows
                  }}
                >
                  <TableCell colSpan={7} />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* table data */}
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredRows.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
    </MainCard>
  );
}


export default EnhancedTable;

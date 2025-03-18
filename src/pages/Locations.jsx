/*
This component allows users to a list of locations in table format. A map is also
diplayed with location points.
*/
import { useState, useMemo, useEffect} from 'react';
import { Button, Modal, Row, Col } from 'react-bootstrap';
import NewLocation from '../components/locations/NewLocation';
import TableWrapper from '../components/TableWrapper';
import { PencilSquareIcon } from '@heroicons/react/24/outline';
import Spinner from '../components/Spinner';
import { useQuery, useMutation } from '@apollo/client';
import {GET_PROJECT_LOCATIONS, INSERT_LOCATIONS_MANY } from '../api/locationGql';
import Map from '../components/Map';
import EditLocation from '../components/locations/EditLocation';
import { convertUtmToLatLng } from '../helpers';
import ExportToCSV from '../components/csvOptions/ExportToCSV';
import ImportToCSV from '../components/csvOptions/ImportCSV';
import { toast } from 'react-hot-toast';
// import 'leaflet/dist/leaflet.css';

const csvTemplateData = [{
  project_code: null,
  location_name: null, 
  x: null, y: null, remarks: null
}]

const LocationPage = () => {
  const {id: projectId, project_code} = JSON.parse(localStorage.getItem('project')); 
  const [show, setShow] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [rowData, setRowData] = useState();
  const [latLng, setLatLng] = useState([]);
  const [csvData, setCsvData] = useState([]);
  const [importData, setImportData] = useState([]);
  const [processing, setProcessing] = useState(false);
  // const [mapReady, setMapReady] = useState(false);
  // const csvData = [];

  const {loading, error, data } = useQuery(GET_PROJECT_LOCATIONS, {
    variables: {projectId},
    skip: !projectId
  });
  const [insertLocationsMany,] = useMutation(INSERT_LOCATIONS_MANY, {
    refetchQueries: [GET_PROJECT_LOCATIONS]
  })

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);
  const handleCloseEdit = () => setShowEdit(false);

  const handleEditBtn = (prop) => {
    setRowData(prop);
    setShowEdit(true);
  }

  const columns = useMemo(
    () =>  [  
      {            
        accessorKey: "id",
        header: () => "ID",
      },
      {            
        accessorKey: "location_name",
        header: () => "Name",
      },
      {
        accessorKey: "y",
        header: () => "Y",            
      }, 
      {
        accessorKey: "x",
        header: () => "X",            
      },                     
      {                
        header: "Actions",
        cell: (prop) => {
          return (
            <div style={{
              display: 'flex', gap: '7%', color: 'green', 
              justifyContent: 'center'
            }}>
              <button>
                <PencilSquareIcon 
                  style={{ width: '24px', height: '24px' }} 
                  onClick={() => handleEditBtn(prop.row.original)}
                />                    
              </button>
              {/* <button>
                <EyeIcon 
                  style={{ width: '24px', height: '24px' }}
                  onClick={() => handleView(prop.row.original)}
                />
              </button> */}
            </div>)
        },
        // footer: props => props.column.id
      },          
    ], 
    []    
  );

  const handleSubmit = async () => {
    // Set processing state to true while handling the submission
    setProcessing(true);

    // Prepare an array 'values' to store location data for insertion
    const values = [];
    // console.log(importData)
    try {
      // Loop through each location in the importData array
      for(const item of importData){
        // make sure the file is uploaded to the current project dashboard
        if(item.project_code !== project_code) {
          setImportData([]); // Clear importData on error
          setProcessing(false);
          return toast.error("File contains invalid project code!")
        }

        // Push relevant data to the 'values' array
        values.push({
          location_name: item.location_name.trim(), 
          x: item.x, y: item.y, remarks: item.remarks,
          project_id: projectId
        });
      }

      // Attempt to insert multiple locations using GraphQL mutation
      await insertLocationsMany({
        variables: {values}
      })
      // Display success message if insertion is successful
      toast.success("Successfully inserted locations")
    }catch(error){
      // Log the error message to the console
      console.error(error.message);

      // Display an error message using toast if insertion fails
      toast.error('Unable to add datasets')
    }
    // Clear the importData array and set processing state to false
    setImportData([])
    setProcessing(false);
  };

  useEffect(() => {    
    // Check if data and locations are available  
    if(data?.locations){

      // Check if data and locations are available
      const tempCsvData = [];
      const tempLatLng = [];

      // Loop through each location in the data
      for(const l of data?.locations){

        // Push relevant data to the CSV data array
        tempCsvData.push({
          location_id: l.id,
          location_name: l.location_name, 
          x: l.x, y: l.y, remarks: l.remarks
        });
        // convertUtmToLatLng(easting, northing, 16, 'Q', locationName)
        tempLatLng.push(convertUtmToLatLng(l.x, l.y, 16, 'Q', l.location_name))            
      }
      setCsvData(tempCsvData)
      setLatLng(tempLatLng);
      }      
  }, [data]);

  if(loading){
    return (
      <div style={{display: 'flex', justifyContent: 'center'}}>
        <Spinner/>
      </div>
    )
  }    

  if(error) {
    console.log(error)
    return <div>Something went wrong! Try refreshing the page</div>
  }     

  return (
    <div className='px-3'>       
     
      <>      
      <Row>
        <Col md={6} sm={12} style={{height: '60dvh'}}>
          {latLng && <Map markers={latLng}  />}
        </Col>
        <Col md={6} sm={12}>
          <div className='mb-3' style={{display: 'flex', gap: '1rem'}}>
            {data?.locations.length === 0 &&
              <Button variant="primary" onClick={handleShow} size='sm'> Add New Location </Button>
            }
            {data?.locations.length > 0 &&
              <ExportToCSV csvData={csvData} fileName='locations' />
            }
            <ExportToCSV csvData={csvTemplateData} fileName={'locations_template'} label='Download CSV Template'/> 
            <div style={{display: 'flex', flexWrap: 'nowrap'}}>
              <ImportToCSV setImportData={setImportData} />
              {importData.length > 0 &&
                <Button onClick={handleSubmit} variant='link' size='sm' disabled={processing}>
                  {processing ? <Spinner size='sm' /> : "Submit imported data"}
                </Button> 
              }
            </div>              
          </div>
          {data?.locations.length > 0 &&
          <TableWrapper 
            data={data?.locations} 
            columns={columns} 
            page={handleShow} 
            insertBtnType="modal" 
          />
          }
        </Col>
      </Row>
      </>    
    
    <Modal show={show} onHide={handleClose} backdrop='static' keyboard={false}>
      <Modal.Header closeButton>
        <Modal.Title>Create New Location</Modal.Title>
      </Modal.Header>
      <Modal.Body> {show && <NewLocation handleClose={handleClose}/>} </Modal.Body>        
    </Modal>

    <Modal show={showEdit} onHide={handleCloseEdit} backdrop='static' keyboard={false}>
      <Modal.Header closeButton>
        <Modal.Title>Edit Location</Modal.Title>
      </Modal.Header>
      <Modal.Body> 
        {showEdit && 
        <EditLocation 
          // data={data?.locations?.filter(l => l.id === rowData.id)} 
          data={rowData}
          handleCloseEdit={handleCloseEdit} 
        />}  
      </Modal.Body>        
    </Modal>
    </div>
  )
}

export default LocationPage